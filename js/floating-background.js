/* Shared animated LiDAR background for non-home public pages.
   Uses the same Three.js point-cloud terrain as the homepage. */
document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("lidar-canvas");
  if (window.THREE && canvas) {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(56, window.innerWidth / window.innerHeight, 0.1, 900);
      camera.position.set(0, 22, 49);
      camera.lookAt(0, 0, 0);

      let renderer;
      try {
          renderer = new THREE.WebGLRenderer({
              canvas,
              alpha: true,
              antialias: false,
              powerPreference: "high-performance"
          });
      } catch (error) {
          console.warn("LiDAR background could not initialize WebGL.", error);
      }

      if (renderer) {
          renderer.setClearColor(0x000000, 0);
          renderer.setSize(window.innerWidth, window.innerHeight);
          renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

          const terrainGroup = new THREE.Group();
          scene.add(terrainGroup);
          const gridX = window.innerWidth < 700 ? 76 : 108;
          const gridZ = window.innerWidth < 700 ? 64 : 88;
          const spacing = window.innerWidth < 700 ? 1.12 : 1.08;
          const pointCount = gridX * gridZ;
          const positions = new Float32Array(pointCount * 3);
          const colors = new Float32Array(pointCount * 3);
          const colorCyan = new THREE.Color(0x42e8ff);
          const colorDeepCyan = new THREE.Color(0x147caa);
          const colorAmber = new THREE.Color(0xffb800);
          const colorSlate = new THREE.Color(0x263e53);
          const xExtent = (gridX - 1) * spacing / 2;
          const zExtent = (gridZ - 1) * spacing / 2;

          function surfaceHeight(x, z, time) {
              return Math.sin(x * 0.105 + time * 0.72) * 1.85
                  + Math.cos(z * 0.135 - time * 0.56) * 1.25
                  + Math.sin((x + z) * 0.072 + time * 0.48) * 0.82
                  + Math.cos(Math.sqrt(x * x + z * z) * 0.10 - time * 0.38) * 0.48;
          }

          let pointIndex = 0;
          for (let ix = 0; ix < gridX; ix++) {
              for (let iz = 0; iz < gridZ; iz++) {
                  const x = (ix - (gridX - 1) / 2) * spacing;
                  const z = (iz - (gridZ - 1) / 2) * spacing;
                  const y = surfaceHeight(x, z, 0);
                  positions[pointIndex * 3] = x;
                  positions[pointIndex * 3 + 1] = y;
                  positions[pointIndex * 3 + 2] = z;

                  const heightMix = THREE.MathUtils.clamp((y + 3.8) / 8.0, 0, 1);
                  const ridgeAccent = THREE.MathUtils.clamp((y - 1.15) / 2.1, 0, 0.8);
                  const pointColor = colorSlate.clone().lerp(colorDeepCyan, 0.36 + heightMix * 0.48);
                  pointColor.lerp(colorCyan, 0.10 + heightMix * 0.22);
                  pointColor.lerp(colorAmber, ridgeAccent * 0.56);
                  colors[pointIndex * 3] = pointColor.r;
                  colors[pointIndex * 3 + 1] = pointColor.g;
                  colors[pointIndex * 3 + 2] = pointColor.b;
                  pointIndex++;
              }
          }

          const pointGeometry = new THREE.BufferGeometry();
          pointGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
          pointGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
          const pointMaterial = new THREE.PointsMaterial({
              size: window.innerWidth < 700 ? 0.19 : 0.225,
              vertexColors: true,
              transparent: true,
              opacity: 0.83,
              sizeAttenuation: true,
              depthWrite: false,
              blending: THREE.AdditiveBlending
          });
          const pointCloud = new THREE.Points(pointGeometry, pointMaterial);
          terrainGroup.add(pointCloud);

          // Thin, widely spaced topology wires reveal the shape of the floating terrain.
          const edgeXs = [];
          const edgeZs = [];
          const edgeStride = window.innerWidth < 700 ? 7 : 5;
          for (let ix = 0; ix < gridX; ix++) {
              for (let iz = 0; iz < gridZ - 1; iz++) {
                  if (ix % edgeStride === 0) {
                      edgeXs.push((ix - (gridX - 1) / 2) * spacing, (ix - (gridX - 1) / 2) * spacing);
                      edgeZs.push((iz - (gridZ - 1) / 2) * spacing, (iz + 1 - (gridZ - 1) / 2) * spacing);
                  }
              }
          }
          for (let iz = 0; iz < gridZ; iz++) {
              for (let ix = 0; ix < gridX - 1; ix++) {
                  if (iz % edgeStride === 0) {
                      edgeXs.push((ix - (gridX - 1) / 2) * spacing, (ix + 1 - (gridX - 1) / 2) * spacing);
                      edgeZs.push((iz - (gridZ - 1) / 2) * spacing, (iz - (gridZ - 1) / 2) * spacing);
                  }
              }
          }
          const edgePositions = new Float32Array(edgeXs.length * 3);
          for (let i = 0; i < edgeXs.length; i++) {
              edgePositions[i * 3] = edgeXs[i];
              edgePositions[i * 3 + 1] = surfaceHeight(edgeXs[i], edgeZs[i], 0) - 0.025;
              edgePositions[i * 3 + 2] = edgeZs[i];
          }
          const edgeGeometry = new THREE.BufferGeometry();
          edgeGeometry.setAttribute("position", new THREE.BufferAttribute(edgePositions, 3));
          const edgeMaterial = new THREE.LineBasicMaterial({
              color: 0x168cb0,
              transparent: true,
              opacity: 0.17,
              depthWrite: false,
              blending: THREE.AdditiveBlending
          });
          const topologyLines = new THREE.LineSegments(edgeGeometry, edgeMaterial);
          terrainGroup.add(topologyLines);

          // Small returns hover slightly above the terrain like live LiDAR hits.
          const returnCount = window.innerWidth < 700 ? 260 : 520;
          const returnPositions = new Float32Array(returnCount * 3);
          const returnColors = new Float32Array(returnCount * 3);
          const returnOffsets = new Float32Array(returnCount);
          const returnSpeed = new Float32Array(returnCount);
          for (let i = 0; i < returnCount; i++) {
              const x = (Math.random() - 0.5) * gridX * spacing;
              const z = (Math.random() - 0.5) * gridZ * spacing;
              returnPositions[i * 3] = x;
              returnPositions[i * 3 + 1] = surfaceHeight(x, z, 0) + 0.7 + Math.random() * 3.1;
              returnPositions[i * 3 + 2] = z;
              returnOffsets[i] = Math.random() * Math.PI * 2;
              returnSpeed[i] = 0.35 + Math.random() * 0.7;
              const returnColor = Math.random() > 0.82 ? colorAmber : colorCyan;
              returnColors[i * 3] = returnColor.r;
              returnColors[i * 3 + 1] = returnColor.g;
              returnColors[i * 3 + 2] = returnColor.b;
          }
          const returnGeometry = new THREE.BufferGeometry();
          returnGeometry.setAttribute("position", new THREE.BufferAttribute(returnPositions, 3));
          returnGeometry.setAttribute("color", new THREE.BufferAttribute(returnColors, 3));
          const returnMaterial = new THREE.PointsMaterial({
              size: window.innerWidth < 700 ? 0.12 : 0.145,
              vertexColors: true,
              transparent: true,
              opacity: 0.58,
              sizeAttenuation: true,
              depthWrite: false,
              blending: THREE.AdditiveBlending
          });
          const floatingReturns = new THREE.Points(returnGeometry, returnMaterial);
          terrainGroup.add(floatingReturns);

          // A luminous line sweeps through the terrain to create a subtle scanning cue.
          const scanVertexCount = 100;
          const scanPositions = new Float32Array(scanVertexCount * 3);
          const scanColors = new Float32Array(scanVertexCount * 3);
          for (let i = 0; i < scanVertexCount; i++) {
              const blend = i / (scanVertexCount - 1);
              const tint = colorCyan.clone().lerp(colorAmber, blend > 0.72 ? (blend - 0.72) / 0.28 : 0);
              scanPositions[i * 3] = -xExtent + blend * xExtent * 2;
              scanPositions[i * 3 + 1] = surfaceHeight(scanPositions[i * 3], -zExtent, 0) + 0.14;
              scanPositions[i * 3 + 2] = -zExtent;
              scanColors[i * 3] = tint.r;
              scanColors[i * 3 + 1] = tint.g;
              scanColors[i * 3 + 2] = tint.b;
          }
          const scanGeometry = new THREE.BufferGeometry();
          scanGeometry.setAttribute("position", new THREE.BufferAttribute(scanPositions, 3));
          scanGeometry.setAttribute("color", new THREE.BufferAttribute(scanColors, 3));
          const scanMaterial = new THREE.LineBasicMaterial({
              vertexColors: true,
              transparent: true,
              opacity: 0.72,
              depthWrite: false,
              blending: THREE.AdditiveBlending
          });
          const scanLine = new THREE.Line(scanGeometry, scanMaterial);
          terrainGroup.add(scanLine);
          terrainGroup.rotation.x = -0.14;
          terrainGroup.position.y = -0.45;

          let mouseX = 0;
          let mouseY = 0;
          window.addEventListener("mousemove", (event) => {
              mouseX = (event.clientX / Math.max(window.innerWidth, 1) - 0.5) * 2;
              mouseY = (event.clientY / Math.max(window.innerHeight, 1) - 0.5) * 2;
              const lat = (20.5937 + mouseY * 0.042).toFixed(4);
              const lon = (78.9629 + mouseX * 0.042).toFixed(4);
              const coordEl = document.getElementById("live-coords");
              if (coordEl) coordEl.textContent = `LAT ${lat}° N // LON ${lon}° E`;
          }, {passive: true});

          const reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          let clock = 0;
          function animateLidar() {
              requestAnimationFrame(animateLidar);
              if (document.hidden) return;
              clock += reducedMotion ? 0.003 : 0.009;
              const motionScale = reducedMotion ? 0.32 : 1;

              const pointAttr = pointGeometry.attributes.position;
              for (let i = 0; i < pointCount; i++) {
                  const x = pointAttr.getX(i);
                  const z = pointAttr.getZ(i);
                  pointAttr.setY(i, surfaceHeight(x, z, clock));
              }
              pointAttr.needsUpdate = true;

              const edgeAttr = edgeGeometry.attributes.position;
              for (let i = 0; i < edgeXs.length; i++) {
                  edgeAttr.setY(i, surfaceHeight(edgeXs[i], edgeZs[i], clock) - 0.025);
              }
              edgeAttr.needsUpdate = true;

              const returnAttr = returnGeometry.attributes.position;
              for (let i = 0; i < returnCount; i++) {
                  const x = returnAttr.getX(i);
                  const z = returnAttr.getZ(i);
                  const lift = 0.7 + (returnOffsets[i] % 1.2) + Math.sin(clock * returnSpeed[i] + returnOffsets[i]) * 0.27 * motionScale;
                  returnAttr.setY(i, surfaceHeight(x, z, clock) + lift);
              }
              returnAttr.needsUpdate = true;

              const scanZ = -zExtent + ((clock * (reducedMotion ? 1.8 : 3.2)) % (zExtent * 2));
              const scanAttr = scanGeometry.attributes.position;
              for (let i = 0; i < scanVertexCount; i++) {
                  const x = -xExtent + (i / (scanVertexCount - 1)) * xExtent * 2;
                  scanAttr.setXYZ(i, x, surfaceHeight(x, scanZ, clock) + 0.16, scanZ);
              }
              scanAttr.needsUpdate = true;

              const idleY = Math.sin(clock * 0.23) * 0.045 * motionScale;
              const targetRotY = mouseX * 0.15 + Math.sin(clock * 0.12) * 0.025 * motionScale;
              const targetRotX = -0.14 + mouseY * 0.035;
              terrainGroup.rotation.y += (targetRotY - terrainGroup.rotation.y) * 0.012;
              terrainGroup.rotation.x += (targetRotX - terrainGroup.rotation.x) * 0.012;
              terrainGroup.position.y = -0.45 + idleY;
              renderer.render(scene, camera);
          }
          animateLidar();

          window.addEventListener("resize", () => {
              camera.aspect = window.innerWidth / Math.max(window.innerHeight, 1);
              camera.updateProjectionMatrix();
              renderer.setSize(window.innerWidth, window.innerHeight);
              renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
          });
          window.addEventListener("beforeunload", () => {
              pointGeometry.dispose(); edgeGeometry.dispose(); returnGeometry.dispose(); scanGeometry.dispose();
              pointMaterial.dispose(); edgeMaterial.dispose(); returnMaterial.dispose(); scanMaterial.dispose(); renderer.dispose();
          }, {once: true});
      }
  }


});
