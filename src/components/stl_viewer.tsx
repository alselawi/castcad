import { Component, createRef } from "react";
import { Stack } from "@fluentui/react";
import * as THREE from "three";
import { observer } from "mobx-react";
import type { DecodedSTL } from "../services/stl_to_mesh";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type STLViewerProps = {
	decodedSTL: DecodedSTL;
};

@observer
export class STLViewer extends Component<STLViewerProps> {
	mountRef = createRef<HTMLDivElement>();
	renderer?: THREE.WebGLRenderer;
	mesh?: THREE.Mesh;
	controls?: OrbitControls;
	camera?: THREE.PerspectiveCamera;
	scene?: THREE.Scene;
	transformControlsGizmo?: THREE.Object3D;
	transformControls?: TransformControls;

	componentDidMount() {
		this.initThree();
		if (this.props.decodedSTL) {
			this.loadSTL(this.props.decodedSTL);
		}
	}

	componentDidUpdate(prevProps: STLViewerProps) {
		if (this.props.decodedSTL !== prevProps.decodedSTL) {
			this.clearScene();
			if (this.props.decodedSTL) {
				this.loadSTL(this.props.decodedSTL);
			}
		}
	}

	componentWillUnmount() {
		this.cleanUp();
	}

	initThree() {
		const mount = this.mountRef.current;
		if (!mount) return;

		const width = document.body.clientWidth;
		const height = document.body.clientHeight;

		// Renderer
		this.renderer = new THREE.WebGLRenderer({ antialias: true });
		this.renderer.setSize(width, height);
		mount.appendChild(this.renderer.domElement);

		// Scene
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color(0xf0f0f0);

		// Camera
		this.camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 1000);
		this.camera.position.set(0, 0, 0);

		// Controls
		this.controls = new OrbitControls(this.camera!, this.renderer!.domElement);
		this.controls.enableDamping = true; // for smoother experience
		this.controls.dampingFactor = 0.05;
		this.controls.screenSpacePanning = true;
		this.controls.minDistance = 10;
		this.controls.maxDistance = 500;
		this.controls.target.set(0, 0, 0); // initial look-at target
		this.controls.update();

		// Transform Controls
		this.transformControls = new TransformControls(
			this.camera!,
			this.renderer!.domElement
		);
		this.transformControls.addEventListener("dragging-changed", (event) => {
			this.controls!.enabled = !event.value; // disable OrbitControls when using transform
		});

		this.transformControlsGizmo = this.transformControls.getHelper();

		// Lights
		const hemisphericLight = new THREE.HemisphereLight(0xffffff, 0x444444, 3);
		hemisphericLight.position.set(0, 200, 0);
		this.scene.add(hemisphericLight);

		// Directional Light
		const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
		directionalLight.position.set(0, 0, 100).normalize();
		this.scene.add(directionalLight);

		// Ground Plane
		const planeSize = 1000;
		const planeGeometry = new THREE.PlaneGeometry(planeSize, planeSize);
		const planeMaterial = new THREE.MeshStandardMaterial({
			color: 0xdddddd, // TODO: make this transparent
			roughness: 1,
			metalness: 0,
			transparent: true,
			opacity: 0.5,
			side: THREE.DoubleSide,
		});
		const plane = new THREE.Mesh(planeGeometry, planeMaterial);
		plane.rotation.x = -Math.PI / 2; // rotate to lie flat
		plane.position.y = -10; // move slightly down if needed
		plane.receiveShadow = true;
		this.scene.add(plane);

		// Grid Helper
		const gridSize = 1000;
		const gridDivisions = 100;
		const gridColorCenterLine = 0x444444;
		const gridColor = 0xcccccc;

		const gridHelper = new THREE.GridHelper(
			gridSize,
			gridDivisions,
			gridColorCenterLine,
			gridColor
		);
		gridHelper.position.y = -10; // adjust height if needed
		this.scene?.add(gridHelper);

		// Start animation loop
		this.animate();
	}

	animate = () => {
		requestAnimationFrame(this.animate);
		this.controls?.update(); // required for damping
		this.renderer?.render(this.scene!, this.camera!);
	};

	loadSTL(decodedSTL: DecodedSTL) {
		const { geometry, mesh } = decodedSTL;
		this.mesh = mesh;

		// Center geometry
		geometry.computeBoundingBox();
		if (geometry.boundingBox) {
			const center = new THREE.Vector3();
			geometry.boundingBox.getCenter(center);
			this.mesh.position.sub(center);
		}

		this.scene?.add(this.mesh);
		this.transformControls.attach(this.mesh);
		this.transformControls.showX = true;
		this.transformControls.showY = true;
		this.transformControls.setSize(1);

		// Adjust camera position to fit model
		this.fitCameraToObject();
	}

	fitCameraToObject(x: number = 150, y: number = 100, z: number = 100) {
		const offset = 1.25;
		const boundingBox = new THREE.Box3().setFromObject(this.mesh);

		const center = boundingBox.getCenter(new THREE.Vector3());
		const size = boundingBox.getSize(new THREE.Vector3());

		// Figure out how to position the camera to fit the object
		const maxSize = Math.max(size.x, size.y, size.z);
		const fitHeightDistance =
			maxSize / (2 * Math.atan((Math.PI * this.camera.fov) / 360));
		const fitWidthDistance = fitHeightDistance / this.camera.aspect;
		const distance = offset * Math.max(fitHeightDistance, fitWidthDistance);

		this.camera.position.copy(center);
		this.camera.position.z += distance;
		this.camera.lookAt(center);
		this.camera.position.set(x, y, z);

		this.camera.updateProjectionMatrix();
	}

	clearScene() {
		if (this.mesh && this.scene) {
			this.scene.remove(this.mesh);
			this.mesh.geometry.dispose();
			if (Array.isArray(this.mesh.material)) {
				this.mesh.material.forEach((mat: any) => mat.dispose());
			} else {
				this.mesh.material.dispose();
			}
			this.mesh = undefined;
		}
	}

	cleanUp() {
		this.clearScene();
		if (this.renderer) {
			this.renderer.dispose();
			if (this.renderer.domElement.parentNode) {
				this.renderer.domElement.parentNode.removeChild(
					this.renderer.domElement
				);
			}
			this.renderer = undefined;
		}
		if (this.controls) {
			this.controls.dispose();
			this.controls = undefined;
		}
	}

	render() {
		return (
			<Stack tokens={{ childrenGap: 8 }}>
				<div
					ref={this.mountRef}
					style={{
						width: "100vw",
						height: "100vh",
						flex: 1,
						border: "1px solid #ddd",
						borderRadius: 4,
						backgroundColor: "#fff",
					}}
				/>
			</Stack>
		);
	}
}
