import { Component, createRef } from "react";
import { Stack } from "@fluentui/react";
import * as THREE from "three";
import { OrbitControls } from "../services/orbit_controls";
import { observer } from "mobx-react";
import type { DecodedSTL } from "../services/stl_to_mesh";

type STLViewerProps = {
	decodedSTL: DecodedSTL;
};

@observer
export class STLViewer extends Component<STLViewerProps> {
	private mountRef = createRef<HTMLDivElement>();
	private renderer?: THREE.WebGLRenderer;
	private scene?: THREE.Scene;
	private camera?: THREE.PerspectiveCamera;
	private mesh?: THREE.Mesh;
	private controls?: OrbitControls;

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
		this.camera.position.set(0, 0, 100);

		// Controls
		this.controls = new OrbitControls(this.camera!, this.renderer!.domElement);
		this.controls.enableDamping = true; // for smoother experience
		this.controls.dampingFactor = 0.05;
		this.controls.screenSpacePanning = true;
		this.controls.minDistance = 10;
		this.controls.maxDistance = 500;
		this.controls.target.set(0, 0, 0); // initial look-at target
		this.controls.update();

		// Lights
		const hemisphericLight = new THREE.HemisphereLight(0xffffff, 0x444444, 3);
		hemisphericLight.position.set(0, 200, 0);
		this.scene.add(hemisphericLight);

		const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
		directionalLight.position.set(0, 0, 100).normalize();
		this.scene.add(directionalLight);

		// Start animation loop
		this.animate();
	}

	animate = () => {
		requestAnimationFrame(this.animate);
		this.controls?.update(); // required for damping
		this.renderer?.render(this.scene!, this.camera!);
	};

	loadSTL(decodedSTL: DecodedSTL) {
		const {geometry, mesh} = decodedSTL;
		this.mesh = mesh;

		// Center geometry
		geometry.computeBoundingBox();
		if (geometry.boundingBox) {
			const center = new THREE.Vector3();
			geometry.boundingBox.getCenter(center);
			this.mesh.position.sub(center);
		}

		this.scene?.add(this.mesh);

		// Adjust camera position to fit model
		this.fitCameraToObject(this.camera!, this.mesh, 1.2);
	}

	fitCameraToObject(
		camera: THREE.PerspectiveCamera,
		object: THREE.Object3D,
		offset = 1.25
	) {
		const boundingBox = new THREE.Box3().setFromObject(object);

		const center = boundingBox.getCenter(new THREE.Vector3());
		const size = boundingBox.getSize(new THREE.Vector3());

		// Figure out how to position the camera to fit the object
		const maxSize = Math.max(size.x, size.y, size.z);
		const fitHeightDistance =
			maxSize / (2 * Math.atan((Math.PI * camera.fov) / 360));
		const fitWidthDistance = fitHeightDistance / camera.aspect;
		const distance = offset * Math.max(fitHeightDistance, fitWidthDistance);

		camera.position.copy(center);
		camera.position.z += distance;
		camera.lookAt(center);

		camera.updateProjectionMatrix();
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
