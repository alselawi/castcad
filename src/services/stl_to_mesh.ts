import * as THREE from "three";
import { STLLoader } from "./stl_loader";

export interface DecodedSTL {
	geometry: THREE.BufferGeometry;
	material: THREE.Material;
	mesh: THREE.Mesh;
}

export function decodeSTL(file: File): Promise<DecodedSTL> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (e) => {
			try {
				const contents = e.target?.result;
				if (
					!contents ||
					(typeof contents !== "string" && !(contents instanceof ArrayBuffer))
				) {
					reject("Failed to read STL file contents.");
					return;
				}
				const loader = new STLLoader();
				const geometry = loader.parse(
					contents instanceof ArrayBuffer
						? contents
						: new TextEncoder().encode(contents)
				);

				const count = geometry.attributes.position.count;

				const color = [0.29, 0.69, 1.0];
				const colors = new Float32Array(count * 3);
				for (let i = 0; i < count; i++) {
					colors[i * 3] = color[0];
					colors[i * 3 + 1] = color[1];
					colors[i * 3 + 2] = color[2];
				}
				geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

				// Create mesh with a basic material
				const material = new THREE.MeshStandardMaterial({
					vertexColors: true,
					color: 0x4ab0ff,
					roughness: 0.5,
					metalness: 0,
					flatShading: true,
				});
				const mesh = new THREE.Mesh(geometry, material);
				resolve({ geometry, material, mesh });
			} catch (err) {
				reject(err);
			}
		};

		reader.readAsArrayBuffer(file);
	});
}
