import * as THREE from "three";

export function cutAwaySelection(
	geometry: THREE.BufferGeometry,
	facesToRemove: Set<number>
): THREE.BufferGeometry {
	if (geometry.index) {
		throw new Error("Geometry must be non-indexed for this method.");
	}

	const posAttr = geometry.getAttribute("position");
	const normalAttr = geometry.getAttribute("normal");
	const uvAttr = geometry.getAttribute("uv");
	const colorAttr = geometry.getAttribute("color");

	const faceCount = posAttr.count / 3; // 3 vertices per triangle
	const facesToRemoveSet = new Set(facesToRemove);

	const newPositions: number[] = [];
	const newNormals: number[] = [];
	const newUVs: number[] = [];
	const newColors: number[] = [];

	for (let faceIndex = 0; faceIndex < faceCount; faceIndex++) {
		if (facesToRemoveSet.has(faceIndex)) continue;

		for (let i = 0; i < 3; i++) {
			const vertIndex = faceIndex * 3 + i;

			newPositions.push(
				posAttr.getX(vertIndex),
				posAttr.getY(vertIndex),
				posAttr.getZ(vertIndex)
			);

			if (normalAttr) {
				newNormals.push(
					normalAttr.getX(vertIndex),
					normalAttr.getY(vertIndex),
					normalAttr.getZ(vertIndex)
				);
			}

			if (uvAttr) {
				newUVs.push(uvAttr.getX(vertIndex), uvAttr.getY(vertIndex));
			}

			if (colorAttr) {
				newColors.push(
					colorAttr.getX(vertIndex),
					colorAttr.getY(vertIndex),
					colorAttr.getZ(vertIndex)
				);
			}
		}
	}

	// Create new geometry
	const newGeometry = new THREE.BufferGeometry();
	newGeometry.setAttribute(
		"position",
		new THREE.Float32BufferAttribute(newPositions, 3)
	);

	if (newNormals.length > 0) {
		newGeometry.setAttribute(
			"normal",
			new THREE.Float32BufferAttribute(newNormals, 3)
		);
	} else {
		newGeometry.computeVertexNormals(); // fallback
	}

	if (newUVs.length > 0) {
		newGeometry.setAttribute("uv", new THREE.Float32BufferAttribute(newUVs, 2));
	}

	if (newColors.length > 0) {
		newGeometry.setAttribute(
			"color",
			new THREE.Float32BufferAttribute(newColors, 3)
		);
	}
	return newGeometry;
}
