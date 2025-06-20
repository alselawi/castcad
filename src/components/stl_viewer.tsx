import { Component, createRef } from "react";
import { Stack } from "@fluentui/react";
import * as THREE from "three";
import { observer } from "mobx-react";
import type { DecodedSTL } from "../services/stl_to_mesh";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type STLViewerProps = {
	decodedSTL: DecodedSTL;
	selecting: boolean;
	onSelect: (faceIndices: Set<number>) => void;
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
	raycaster = new THREE.Raycaster();
	mouse = new THREE.Vector2();
	originalColors?: Float32Array;
	isDragging = false;
	selectedFaceIndices = new Set<number>();

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
			color: 0xdddddd,
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

		// Mouse listener (for selection)
		const dom = this.renderer!.domElement;
		dom.addEventListener("mousedown", this.onMouseDown);
		dom.addEventListener("mousemove", this.onMouseMove);
		dom.addEventListener("mouseup", this.onMouseUp);

		// Start animation loop
		this.animate();
	}

	onMouseDown = (event: MouseEvent) => {
		if (!this.props.selecting) return;
		const rect = this.renderer!.domElement.getBoundingClientRect();
		this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
		this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

		this.raycaster.setFromCamera(this.mouse, this.camera!);
		if (!this.mesh) return;

		const intersects = this.raycaster.intersectObject(this.mesh, false);
		if (intersects.length > 0) {
			this.isDragging = true;
			if (this.controls) this.controls.enabled = false;
		}
	};
	onMouseUp = () => {
		if (!this.props.selecting) return;
		this.isDragging = false;
		if (this.controls) this.controls.enabled = true;
	};

	onMouseMove = (event: MouseEvent) => {
		if (!this.props.selecting) return;
		const rect = this.renderer!.domElement.getBoundingClientRect();
		this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
		this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

		if (!this.mesh || !this.camera || !this.isDragging) return;

		const geometry = this.mesh.geometry as THREE.BufferGeometry;
		const position = geometry.attributes.position;
		const camera = this.camera;

		const brushRadiusPixels = 10;
		const mouseScreenX = event.clientX;
		const mouseScreenY = event.clientY;

		const vector = new THREE.Vector3();
		const worldPosition = new THREE.Vector3();

		for (let faceIndex = 0; faceIndex < position.count / 3; faceIndex++) {
			// Get the centroid of the triangle
			const a = new THREE.Vector3().fromBufferAttribute(
				position,
				faceIndex * 3 + 0
			);
			const b = new THREE.Vector3().fromBufferAttribute(
				position,
				faceIndex * 3 + 1
			);
			const c = new THREE.Vector3().fromBufferAttribute(
				position,
				faceIndex * 3 + 2
			);

			const centroid = new THREE.Vector3()
				.addVectors(a, b)
				.add(c)
				.multiplyScalar(1 / 3);

			// Transform centroid to world and then to screen space
			this.mesh.localToWorld(worldPosition.copy(centroid));
			vector.copy(worldPosition).project(camera);

			// Convert normalized device coordinates to screen coordinates
			const screenX = ((vector.x + 1) / 2) * rect.width + rect.left;
			const screenY = ((-vector.y + 1) / 2) * rect.height + rect.top;

			const dx = screenX - mouseScreenX;
			const dy = screenY - mouseScreenY;
			const distSq = dx * dx + dy * dy;

			if (distSq <= brushRadiusPixels * brushRadiusPixels) {
				if (!this.selectedFaceIndices.has(faceIndex)) {
					this.selectedFaceIndices.add(faceIndex);
				}
			}
		}

		this.highlightSelectedFaces();
		this.renderer?.render(this.scene!, this.camera!);
		this.props.onSelect(this.selectedFaceIndices);
	};

	highlightSelectedFaces() {
		if (!this.mesh) return;
		const geometry = this.mesh.geometry as THREE.BufferGeometry;

		// Init vertex colors if not done yet
		if (!geometry.getAttribute("color")) {
			const count = geometry.attributes.position.count;
			const colorAttr = new THREE.Float32BufferAttribute(count * 3, 3);
			colorAttr.setUsage(THREE.DynamicDrawUsage);
			geometry.setAttribute("color", colorAttr);

			for (let i = 0; i < count; i++) {
				colorAttr.setXYZ(i, 1, 1, 1); // default white
			}
		}

		const colorAttr = geometry.getAttribute("color") as THREE.BufferAttribute;

		// Paint all selected faces red
		for (const faceIndex of this.selectedFaceIndices) {
			for (let i = 0; i < 3; i++) {
				const vertexIndex = faceIndex * 3 + i;
				colorAttr.setXYZ(vertexIndex, 1, 0, 0); // red
			}
		}
		colorAttr.needsUpdate = true;

		if (this.mesh.material instanceof THREE.Material)
			this.mesh.material.vertexColors = true;
	}

	restoreColors() {
		if (!this.originalColors || !this.mesh) return;
		const geometry = this.mesh.geometry as THREE.BufferGeometry;
		const colorAttr = geometry.getAttribute("color") as THREE.BufferAttribute;
		colorAttr.copyArray(this.originalColors);
		colorAttr.needsUpdate = true;
	}

	clearSelection = () => {
		if (!this.mesh) return;

		const geometry = this.mesh.geometry;
		const colorAttr = geometry.getAttribute("color") as THREE.BufferAttribute;

		if (!colorAttr) return;

		// Clear selected indices
		this.selectedFaceIndices.clear();

		// Reset all colors to default light blue (0x4ab0ff = RGB: 0.29, 0.69, 1.0)
		for (let i = 0; i < colorAttr.count; i++) {
			colorAttr.setXYZ(i, 0.29, 0.69, 1.0);
		}
		colorAttr.needsUpdate = true;

		this.renderer?.render(this.scene!, this.camera!);
		this.props.onSelect(this.selectedFaceIndices);
	};

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
			this.originalColors = undefined;
			this.selectedFaceIndices.clear();
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
						cursor: this.props.selecting
							? `url('data:image/svg+xml;utf8, <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"> <circle cx="16" cy="16" r="8" stroke="red" stroke-width="2" fill="transparent"/> </svg>') 16 16, auto`
							: undefined,
						userSelect: "auto",
					}}
				></div>
			</Stack>
		);
	}
}

/*** TODO:


Responsive Renderer Size on Window Resize
You're using document.body.clientWidth, but this won't respond dynamically if the window resizes. Add:

window.addEventListener("resize", this.handleResize);

handleResize = () => {
	if (!this.renderer || !this.camera) return;
	const width = window.innerWidth;
	const height = window.innerHeight;
	this.renderer.setSize(width, height);
	this.camera.aspect = width / height;
	this.camera.updateProjectionMatrix();
};


Don’t forget to remove it in componentWillUnmount.


 */
