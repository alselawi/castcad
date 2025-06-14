import {
	BufferAttribute,
	BufferGeometry,
	Color,
	FileLoader,
	Float32BufferAttribute,
	Loader,
	LoadingManager,
	Vector3,
	SRGBColorSpace,
} from "three";

type OnLoadCallback = (geometry: BufferGeometry) => void;
type OnProgressCallback = (event: ProgressEvent<EventTarget>) => void;
type OnErrorCallback = (event: ErrorEvent | Error) => void;

class STLLoader extends Loader {
	constructor(manager?: LoadingManager) {
		super(manager);
	}

	load(
		url: string,
		onLoad: OnLoadCallback,
		onProgress?: OnProgressCallback,
		onError?: OnErrorCallback
	): void {
		const scope = this;

		const loader = new FileLoader(this.manager);
		loader.setPath(this.path);
		loader.setResponseType("arraybuffer");
		loader.setRequestHeader(this.requestHeader);
		loader.setWithCredentials(this.withCredentials);

		loader.load(
			url,
			function (data) {
				try {
					onLoad(scope.parse(data));
				} catch (e) {
					if (onError) {
						onError(e as Error);
					} else {
						console.error(e);
					}
					scope.manager?.itemError(url);
				}
			},
			onProgress,
			onError ? (err: unknown) => onError(err as Error) : undefined
		);
	}
	parse(data: ArrayBuffer | string): BufferGeometry {
		function isBinary(data: ArrayBuffer): boolean {
			const reader = new DataView(data);
			const faceSize = 50; // 12*4 bytes for vertices + 2 bytes attribute byte count
			const nFaces = reader.getUint32(80, true);
			const expect = 84 + nFaces * faceSize;

			if (expect === reader.byteLength) return true;

			// Check if ASCII by detecting 'solid' at the start (up to first 5 bytes offset)
			const solid = [115, 111, 108, 105, 100]; // "solid"
			for (let off = 0; off < 5; off++) {
				let match = true;
				for (let i = 0; i < solid.length; i++) {
					if (reader.getUint8(off + i) !== solid[i]) {
						match = false;
						break;
					}
				}
				if (match) return false; // ASCII
			}

			return true; // Binary if no "solid" found
		}

		function parseBinary(data: ArrayBuffer): BufferGeometry {
			const reader = new DataView(data);
			const faces = reader.getUint32(80, true);

			let hasColors = false;
			let colors: Float32Array | undefined;
			let defaultR = 1,
				defaultG = 1,
				defaultB = 1,
				alpha = 1;

			let r = defaultR,
				g = defaultG,
				b = defaultB;

			// Check header for default color "COLOR=rgba"
			for (let index = 0; index < 70; index++) {
				if (
					reader.getUint32(index, false) === 0x434f4c4f && // 'COLO'
					reader.getUint8(index + 4) === 0x52 && // 'R'
					reader.getUint8(index + 5) === 0x3d // '='
				) {
					hasColors = true;
					colors = new Float32Array(faces * 3 * 3);

					defaultR = reader.getUint8(index + 6) / 255;
					defaultG = reader.getUint8(index + 7) / 255;
					defaultB = reader.getUint8(index + 8) / 255;
					alpha = reader.getUint8(index + 9) / 255;
					r = defaultR;
					g = defaultG;
					b = defaultB;
					break;
				}
			}

			const dataOffset = 84;
			const faceLength = 50; // 12 bytes normal + 36 bytes vertices + 2 bytes attribute

			const geometry = new BufferGeometry();

			const vertices = new Float32Array(faces * 3 * 3);
			const normals = new Float32Array(faces * 3 * 3);

			const color = new Color();

			for (let face = 0; face < faces; face++) {
				const start = dataOffset + face * faceLength;
				const normalX = reader.getFloat32(start, true);
				const normalY = reader.getFloat32(start + 4, true);
				const normalZ = reader.getFloat32(start + 8, true);

				if (hasColors) {
					const packedColor = reader.getUint16(start + 48, true);

					if ((packedColor & 0x8000) === 0) {
						r = (packedColor & 0x1f) / 31;
						g = ((packedColor >> 5) & 0x1f) / 31;
						b = ((packedColor >> 10) & 0x1f) / 31;
					} else {
						r = defaultR;
						g = defaultG;
						b = defaultB;
					}
				}

				for (let i = 1; i <= 3; i++) {
					const vertexStart = start + i * 12;
					const componentIdx = face * 9 + (i - 1) * 3;

					vertices[componentIdx] = reader.getFloat32(vertexStart, true);
					vertices[componentIdx + 1] = reader.getFloat32(vertexStart + 4, true);
					vertices[componentIdx + 2] = reader.getFloat32(vertexStart + 8, true);

					normals[componentIdx] = normalX;
					normals[componentIdx + 1] = normalY;
					normals[componentIdx + 2] = normalZ;

					if (hasColors && colors) {
						color.setRGB(r, g, b, SRGBColorSpace);
						colors[componentIdx] = color.r;
						colors[componentIdx + 1] = color.g;
						colors[componentIdx + 2] = color.b;
					}
				}
			}

			geometry.setAttribute("position", new BufferAttribute(vertices, 3));
			geometry.setAttribute("normal", new BufferAttribute(normals, 3));

			if (hasColors && colors) {
				geometry.setAttribute("color", new BufferAttribute(colors, 3));
				// @ts-ignore
				geometry.hasColors = true;
				// @ts-ignore
				geometry.alpha = alpha;
			}

			return geometry;
		}
		function parseASCII(data: string): BufferGeometry {
			const geometry = new BufferGeometry();
			const patternSolid = /solid([\s\S]*?)endsolid/g;
			const patternFace = /facet([\s\S]*?)endfacet/g;
			const patternName = /solid\s(.+)/;
			let faceCounter = 0;

			const patternFloat = /[\s]+([+-]?(?:\d*)(?:\.\d*)?(?:[eE][+-]?\d+)?)/
				.source;
			const patternVertex = new RegExp(
				"vertex" + patternFloat + patternFloat + patternFloat,
				"g"
			);
			const patternNormal = new RegExp(
				"normal" + patternFloat + patternFloat + patternFloat,
				"g"
			);

			const vertices: number[] = [];
			const normals: number[] = [];
			const groupNames: string[] = [];

			const normal = new Vector3();

			let result: RegExpExecArray | null;

			let groupCount = 0;
			let startVertex = 0;
			let endVertex = 0;

			while ((result = patternSolid.exec(data)) !== null) {
				startVertex = endVertex;

				const solid = result[0];

				const nameMatch = patternName.exec(solid);
				const name = nameMatch !== null ? nameMatch[1] : "";
				groupNames.push(name);

				while ((result = patternFace.exec(solid)) !== null) {
					let vertexCountPerFace = 0;
					let normalCountPerFace = 0;

					const text = result[0];

					while ((result = patternNormal.exec(text)) !== null) {
						normal.x = parseFloat(result[1]);
						normal.y = parseFloat(result[2]);
						normal.z = parseFloat(result[3]);
						normalCountPerFace++;
					}

					while ((result = patternVertex.exec(text)) !== null) {
						vertices.push(
							parseFloat(result[1]),
							parseFloat(result[2]),
							parseFloat(result[3])
						);
						normals.push(normal.x, normal.y, normal.z);
						vertexCountPerFace++;
						endVertex++;
					}

					if (normalCountPerFace !== 1) {
						console.error(
							`THREE.STLLoader: Something isn't right with the normal of face number ${faceCounter}`
						);
					}

					if (vertexCountPerFace !== 3) {
						console.error(
							`THREE.STLLoader: Something isn't right with the vertices of face number ${faceCounter}`
						);
					}

					faceCounter++;
				}

				const start = startVertex;
				const count = endVertex - startVertex;

				geometry.userData.groupNames = groupNames;

				geometry.addGroup(start, count, groupCount);
				groupCount++;
			}

			geometry.setAttribute(
				"position",
				new Float32BufferAttribute(vertices, 3)
			);
			geometry.setAttribute("normal", new Float32BufferAttribute(normals, 3));

			return geometry;
		}

		function ensureString(buffer: ArrayBuffer | string): string {
			if (typeof buffer !== "string") {
				return new TextDecoder().decode(buffer);
			}
			return buffer;
		}

		function ensureBinary(buffer: ArrayBuffer | string): ArrayBuffer {
			if (typeof buffer === "string") {
				const arrayBuffer = new Uint8Array(buffer.length);
				for (let i = 0; i < buffer.length; i++) {
					arrayBuffer[i] = buffer.charCodeAt(i) & 0xff; // implicitly assumes little-endian
				}
				return arrayBuffer.buffer;
			}
			return buffer;
		}

		const binData = ensureBinary(data);

		return isBinary(binData)
			? parseBinary(binData)
			: parseASCII(ensureString(data));
	}
}

export { STLLoader };
