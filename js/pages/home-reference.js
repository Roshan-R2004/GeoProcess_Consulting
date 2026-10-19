const GEOPROCESS_CONFIG = {
            email: "contact@geoprocessconsulting.in",
            whatsappNumber: "917205666324",
            whatsappDisplay: "+91 72056 66324",
            website: "https://geoprocessconsulting.in"
        };

        window.addEventListener("DOMContentLoaded", () => {
            const waUrl = `https://wa.me/${GEOPROCESS_CONFIG.whatsappNumber}?text=${encodeURIComponent("Hello GeoProcess Consulting, I would like to discuss a geospatial/BIM project.")}`;
            const mailUrl = `mailto:${GEOPROCESS_CONFIG.email}`;
            const drawerWaLink = document.getElementById("drawer-wa-link");
            const drawerEmailLink = document.getElementById("drawer-email-link");
            if (drawerWaLink) drawerWaLink.href = waUrl;
            if (drawerEmailLink) {
                drawerEmailLink.href = mailUrl;
                drawerEmailLink.textContent = `EMAIL: ${GEOPROCESS_CONFIG.email}`;
            }

            // -----------------------------------------------------------------------
            // 1. PARSE .split-animate HEADINGS INTO MASKED WORD WRAPPERS
            // -----------------------------------------------------------------------
            document.querySelectorAll(".split-animate").forEach((heading) => {
                const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT, null, false);
                const textNodes = [];
                while (walker.nextNode()) textNodes.push(walker.currentNode);

                textNodes.forEach((node) => {
                    const words = node.nodeValue.split(/(\s+)/);
                    if (words.length <= 1 && !node.nodeValue.trim()) return;
                    const frag = document.createDocumentFragment();
                    words.forEach((word) => {
                        if (/^\s+$/.test(word)) {
                            frag.appendChild(document.createTextNode(word));
                        } else if (word.length > 0) {
                            const mask = document.createElement("span");
                            mask.className = "split-word-mask";
                            const inner = document.createElement("span");
                            inner.className = "split-word-inner";
                            inner.textContent = word;
                            mask.appendChild(inner);
                            frag.appendChild(mask);
                        }
                    });
                    node.parentNode.replaceChild(frag, node);
                });
            });

            // -----------------------------------------------------------------------
            // 2. 3D OPTICAL GLASS LOUVER OPENING SEQUENCE
            // -----------------------------------------------------------------------
            const loaderBar = document.getElementById("loader-bar");
            const loaderPercent = document.getElementById("loader-percent");
            const loaderStatus = document.getElementById("loader-status");
            const curtain = document.getElementById("page-curtain");
            const glassCore = document.getElementById("glass-loader-core");
            const horizonLaser = document.getElementById("glass-horizon-laser");
            const shutterPanes = document.querySelectorAll(".glass-shutter-pane");
            const heroWords = document.querySelectorAll(".hero-title .split-word-inner");
            let progress = {val: 0};

            if (window.gsap) {
                const openTl = gsap.timeline();

                // Initial Frosted Pre-Materialization State
                gsap.set([".hero-main-card", ".geospatial-preview-card"], {
                    opacity: 0,
                    y: 44,
                    scale: 0.95,
                    filter: "blur(20px)"
                });
                gsap.set(heroWords, {yPercent: 115, opacity: 0, filter: "blur(8px)"});
                gsap.set(".site-header", {yPercent: -100, opacity: 0});

                // Step A: Telemetry Counter & Progress Bar
                openTl.to(progress, {
                    val: 100,
                    duration: 1.35,
                    ease: "power2.inOut",
                    onUpdate: () => {
                        const p = Math.round(progress.val);
                        loaderBar.style.width = p + "%";
                        if (loaderPercent) loaderPercent.textContent = `${String(p).padStart(3, "0")}%`;
                        if (p > 65) loaderStatus.textContent = "LOCKING WGS84 SPATIAL DATUM...";
                    }
                })
                    // Step B: Ignite Horizontal Laser Seam across the Glass
                    .to(horizonLaser, {
                        scaleX: 1,
                        duration: 0.35,
                        ease: "expo.out"
                    }, "-=0.15")
                    // Step C: Expand & Refract the Center Glass Lens Core
                    .to(glassCore, {
                        scale: 1.18,
                        opacity: 0,
                        filter: "blur(24px)",
                        duration: 0.5,
                        ease: "power3.in"
                    }, "-=0.1")
                    .to(horizonLaser, {
                        opacity: 0,
                        height: "140px",
                        filter: "blur(30px)",
                        duration: 0.45,
                        ease: "power2.out"
                    }, "<")
                    // Step D: 3D Optical Glass Louvers Rotate & Part from Center Outward
                    .to(shutterPanes, {
                        rotateY: 78,
                        scaleX: 0,
                        yPercent: (i) => (i % 2 === 0 ? -18 : 18),
                        opacity: 0,
                        duration: 0.95,
                        stagger: {each: 0.065, from: "center"},
                        ease: "expo.inOut",
                        onComplete: () => {
                            curtain.style.display = "none";
                        }
                    }, "-=0.32")
                    // Step E: De-frost Header & Hero Glass Bento Cards
                    .to(".site-header", {
                        yPercent: 0,
                        opacity: 1,
                        duration: 0.65,
                        ease: "power3.out"
                    }, "-=0.65")
                    .to([".hero-main-card", ".geospatial-preview-card"], {
                        opacity: 1,
                        y: 0,
                        scale: 1,
                        filter: "blur(0px)",
                        duration: 0.95,
                        stagger: 0.12,
                        ease: "power3.out",
                        clearProps: "filter",
                        onComplete: () => {
                            document.querySelectorAll(".glass-sheen-sweep").forEach((el) => el.classList.add("sheen-active"));
                            if (typeof window.__initGeoProcessImpactCounters === "function") window.__initGeoProcessImpactCounters();
                        }
                    }, "-=0.6")
                    // Step F: Unmask Split-Text Hero Words
                    .to(heroWords, {
                        yPercent: 0,
                        opacity: 1,
                        filter: "blur(0px)",
                        duration: 0.65,
                        stagger: 0.035,
                        ease: "power3.out",
                        clearProps: "filter"
                    }, "-=0.75");
            } else {
                curtain.style.display = "none";
            }

            // -----------------------------------------------------------------------
            // 3. LENIS SMOOTH SCROLL & GSAP SCROLLTRIGGER
            // -----------------------------------------------------------------------
            if (window.Lenis && window.gsap && window.ScrollTrigger) {
                gsap.registerPlugin(ScrollTrigger);
                const lenis = new Lenis({duration: 1.15, smoothWheel: true});
                lenis.on("scroll", ScrollTrigger.update);
                gsap.ticker.add((time) => lenis.raf(time * 1000));
                gsap.ticker.lagSmoothing(0);

                // Scroll-triggered Split-Text Headings (Section Titles)
                gsap.utils.toArray(".section-title.split-animate").forEach((title) => {
                    const words = title.querySelectorAll(".split-word-inner");
                    if (!words.length) return;
                    gsap.from(words, {
                        scrollTrigger: {
                            trigger: title,
                            start: "top 88%"
                        },
                        yPercent: 110,
                        opacity: 0,
                        filter: "blur(6px)",
                        duration: 0.65,
                        stagger: 0.04,
                        ease: "power3.out",
                        clearProps: "filter"
                    });
                });

                // Staggered Bento Card Scroll Reveals
                gsap.utils.toArray("#services .bento-card, #contact .bento-card").forEach((card, i) => {
                    gsap.from(card, {
                        scrollTrigger: {
                            trigger: card,
                            start: "top 88%",
                            toggleActions: "play none none reverse"
                        },
                        y: 48,
                        opacity: 0,
                        scale: 0.97,
                        duration: 0.75,
                        delay: (i % 3) * 0.08,
                        ease: "power3.out"
                    });
                });
            }

            // -----------------------------------------------------------------------
            // 4. FLOATING THREE.JS LIDAR TERRAIN BACKGROUND
            //    Multi-wave terrain, fine topology, floating return points, and a moving scan sweep.
            // -----------------------------------------------------------------------
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

            // -----------------------------------------------------------------------
            // 4B. VIEWPORT-TRIGGERED COMPANY COUNTERS
            // -----------------------------------------------------------------------
            const impactCounters = document.querySelectorAll(".impact-count[data-count-to]");
            const renderFinalCounter = (node) => {
                node.textContent = `${node.dataset.countTo}${node.dataset.suffix || ""}`;
            };
            if (impactCounters.length) {
                let impactCountersInitialized = false;
                const reduceCounterMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
                const animateCounter = (node) => {
                    if (node.dataset.counted === "true") return;
                    node.dataset.counted = "true";
                    const target = Number(node.dataset.countTo || 0);
                    const suffix = node.dataset.suffix || "";
                    if (reduceCounterMotion || !Number.isFinite(target)) {
                        renderFinalCounter(node);
                        return;
                    }
                    const duration = 1450;
                    const startedAt = performance.now();
                    node.textContent = `0${suffix}`;
                    const tick = (now) => {
                        const progress = Math.min((now - startedAt) / duration, 1);
                        const eased = 1 - Math.pow(1 - progress, 3);
                        node.textContent = `${Math.round(target * eased)}${suffix}`;
                        if (progress < 1) requestAnimationFrame(tick);
                        else renderFinalCounter(node);
                    };
                    requestAnimationFrame(tick);
                };
                const initImpactCounters = () => {
                    if (impactCountersInitialized) return;
                    impactCountersInitialized = true;
                    if ("IntersectionObserver" in window && !reduceCounterMotion) {
                        const counterObserver = new IntersectionObserver((entries, observer) => {
                            entries.forEach((entry) => {
                                if (!entry.isIntersecting) return;
                                const heroCard = entry.target.closest(".hero-main-card");
                                // Wait until the glass intro animation has revealed its contents.
                                if (heroCard && Number.parseFloat(getComputedStyle(heroCard).opacity) < 0.85) return;
                                animateCounter(entry.target);
                                observer.unobserve(entry.target);
                            });
                        }, {threshold: 0.55});
                        impactCounters.forEach((counter) => counterObserver.observe(counter));
                    } else {
                        impactCounters.forEach(renderFinalCounter);
                    }
                };
                // Start after the hero glass has appeared; keep a fallback if the animation library fails.
                window.__initGeoProcessImpactCounters = initImpactCounters;
                if (window.gsap) window.setTimeout(initImpactCounters, 4500);
                else initImpactCounters();
            }

            // -----------------------------------------------------------------------
            // 5. SPRING-PHYSICS CURSOR & 3D CARD TILT
            // -----------------------------------------------------------------------
            if (window.matchMedia("(pointer: fine)").matches) {
                const dot = document.getElementById("cursor-dot");
                const reticle = document.getElementById("cursor-reticle");
                let curX = window.innerWidth / 2, curY = window.innerHeight / 2;
                let retX = curX, retY = curY;

                window.addEventListener("mousemove", (e) => {
                    curX = e.clientX;
                    curY = e.clientY;
                    if (dot) {
                        dot.style.left = `${curX}px`;
                        dot.style.top = `${curY}px`;
                    }
                }, {passive: true});

                function updateSpringCursor() {
                    retX += (curX - retX) * 0.16;
                    retY += (curY - retY) * 0.16;
                    if (reticle) {
                        reticle.style.left = `${retX}px`;
                        reticle.style.top = `${retY}px`;
                    }
                    requestAnimationFrame(updateSpringCursor);
                }
                updateSpringCursor();

                document.querySelectorAll("a, button, .bento-card, .slide-card").forEach((el) => {
                    el.addEventListener("mouseenter", () => reticle && reticle.classList.add("is-hovering"));
                    el.addEventListener("mouseleave", () => reticle && reticle.classList.remove("is-hovering"));
                });
            }

            document.querySelectorAll(".tilt-card").forEach((card) => {
                card.addEventListener("mousemove", (e) => {
                    const rect = card.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    card.style.setProperty("--mouse-x", `${x}px`);
                    card.style.setProperty("--mouse-y", `${y}px`);

                    const rotateY = ((x / rect.width) - 0.5) * 8;
                    const rotateX = ((y / rect.height) - 0.5) * -8;
                    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
                });

                card.addEventListener("mouseleave", () => {
                    card.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg)";
                });
            });

            // -----------------------------------------------------------------------
            // 6. FULLSCREEN GLASSMORPHISM NAVIGATION DRAWER & GLASS SHUTTER PAGE EXIT
            // -----------------------------------------------------------------------
            const menuBtn = document.getElementById("menu-toggle");
            const navDrawer = document.getElementById("nav-drawer");
            if (menuBtn && navDrawer) {
                menuBtn.addEventListener("click", () => {
                    const open = navDrawer.classList.toggle("is-open");
                    menuBtn.innerHTML = open ? "<span>[CLOSE // ESC]</span>" : "<span>[MENU // HUD]</span>";
                });
                document.querySelectorAll(".drawer-link").forEach((link) => {
                    link.addEventListener("click", () => {
                        navDrawer.classList.remove("is-open");
                        menuBtn.innerHTML = "<span>[MENU // HUD]</span>";
                    });
                });
            }

            // 3D Glass Louver Closing Transition on Multi-Page Navigation
            document.querySelectorAll('a[href]').forEach((link) => {
                link.addEventListener('click', (event) => {
                    const href = link.getAttribute('href') || '';
                    if (!/\.html(?:[?#]|$)/i.test(href) || link.target === '_blank' || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                    const url = new URL(href, window.location.href);
                    if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
                    if (!curtain) return;

                    event.preventDefault();
                    loaderStatus.textContent = 'ROUTING SPATIAL MODULE...';
                    if (loaderPercent) loaderPercent.textContent = '100%';
                    loaderBar.style.width = '100%';
                    curtain.style.display = 'flex';

                    if (window.gsap) {
                        const exitTl = gsap.timeline({
                            onComplete: () => {window.location.href = url.href;}
                        });
                        exitTl.fromTo(shutterPanes,
                            {rotateY: 78, scaleX: 0, opacity: 0},
                            {rotateY: 0, scaleX: 1, yPercent: 0, opacity: 1, duration: 0.55, stagger: {each: 0.045, from: "edges"}, ease: "expo.inOut"}
                        ).fromTo(glassCore,
                            {scale: 0.88, opacity: 0, filter: "blur(16px)"},
                            {scale: 1, opacity: 1, filter: "blur(0px)", duration: 0.35, ease: "power2.out"},
                            "-=0.25"
                        );
                    } else {
                        window.location.href = url.href;
                    }
                });
            });

            // -----------------------------------------------------------------------
            // 7. PINNED HORIZONTAL PIPELINE (DESKTOP) / SWIPE TRACK (MOBILE)
            // -----------------------------------------------------------------------
            const pipelineSection = document.querySelector(".pipeline-section");
            const pipelineViewport = document.getElementById("pipeline-viewport");
            const pipelineTrack = document.getElementById("pipeline-track");
            if (pipelineSection && pipelineViewport && pipelineTrack) {
                if (window.gsap && window.ScrollTrigger && window.matchMedia("(min-width: 901px) and (prefers-reduced-motion: no-preference)").matches) {
                    gsap.registerPlugin(ScrollTrigger);
                    const getTravel = () => Math.max(0, pipelineTrack.scrollWidth - pipelineViewport.clientWidth);
                    gsap.to(pipelineTrack, {
                        x: () => -getTravel(),
                        ease: "none",
                        scrollTrigger: {
                            trigger: pipelineSection,
                            start: "top top",
                            end: () => `+=${Math.max(520, getTravel() * 1.15)}`,
                            pin: true,
                            scrub: 0.8,
                            invalidateOnRefresh: true
                        }
                    });
                } else {
                    pipelineViewport.style.overflowX = "auto";
                    pipelineViewport.style.scrollSnapType = "x mandatory";
                    pipelineTrack.querySelectorAll(".pipeline-stage").forEach((card) => {
                        card.style.scrollSnapAlign = "start";
                    });
                }
            }

            // -----------------------------------------------------------------------
            // 8. MOMENTUM PORTFOLIO SLIDER
            // -----------------------------------------------------------------------
            const sliderTrack = document.getElementById("slider-track");
            const sliderViewport = document.getElementById("portfolio-slider");
            const prevBtn = document.getElementById("slide-prev");
            const nextBtn = document.getElementById("slide-next");
            let currentSlideOffset = 0;

            const sliderMaxOffset = () => Math.min(0, sliderViewport.clientWidth - sliderTrack.scrollWidth);
            const applySliderOffset = (offset, animate = false) => {
                currentSlideOffset = Math.max(sliderMaxOffset(), Math.min(0, offset));
                if (window.gsap && animate) {
                    gsap.to(sliderTrack, {x: currentSlideOffset, duration: 0.55, ease: "power3.out"});
                } else {
                    sliderTrack.style.transform = `translateX(${currentSlideOffset}px)`;
                }
            };

            function moveSlider(dir) {applySliderOffset(currentSlideOffset + dir * 440, true);}
            prevBtn?.addEventListener("click", () => moveSlider(1));
            nextBtn?.addEventListener("click", () => moveSlider(-1));

            let draggingSlider = false, dragStartX = 0, dragStartOffset = 0;
            sliderViewport.addEventListener("pointerdown", (e) => {
                if (e.pointerType === "mouse" && e.button !== 0) return;
                draggingSlider = true;
                dragStartX = e.clientX;
                dragStartOffset = currentSlideOffset;
                sliderViewport.setPointerCapture?.(e.pointerId);
            });
            sliderViewport.addEventListener("pointermove", (e) => {
                if (!draggingSlider) return;
                applySliderOffset(dragStartOffset + (e.clientX - dragStartX));
            });
            const stopSliderDrag = () => {draggingSlider = false;};
            sliderViewport.addEventListener("pointerup", stopSliderDrag);
            sliderViewport.addEventListener("pointercancel", stopSliderDrag);
            sliderViewport.addEventListener("lostpointercapture", stopSliderDrag);

            window.addEventListener("resize", () => {
                applySliderOffset(currentSlideOffset);
                if (window.ScrollTrigger) ScrollTrigger.refresh();
            });

            // -----------------------------------------------------------------------
            // 9. AI ASSISTANT TRIGGER & RFQ FORM DISPATCH
            // -----------------------------------------------------------------------
            const heroAiBtn = document.getElementById("hero-ai-trigger");
            heroAiBtn?.addEventListener("click", () => {
                const launcher = document.querySelector("#gp-ai-root .gp-ai-launcher");
                if (launcher) launcher.click();
            });

            const rfqForm = document.getElementById("rfq-form");
            const rfqWaBtn = document.getElementById("rfq-whatsapp-btn");
            const rfqServiceInput = document.getElementById("client-service");
            const rfqOtherServiceWrap = document.getElementById("client-other-service-wrap");
            const rfqOtherServiceInput = document.getElementById("client-other-service");

            function toggleRfqOtherService() {
                const isOther = rfqServiceInput?.value === "Other";
                if (rfqOtherServiceWrap) rfqOtherServiceWrap.hidden = !isOther;
                if (rfqOtherServiceInput) {
                    rfqOtherServiceInput.required = Boolean(isOther);
                    if (!isOther) rfqOtherServiceInput.value = "";
                }
            }

            rfqServiceInput?.addEventListener("change", toggleRfqOtherService);
            toggleRfqOtherService();

            function getRfqPayload() {
                const name = document.getElementById("client-name").value || "Prospective Client";
                const email = document.getElementById("client-email").value || "Not specified";
                const service = document.getElementById("client-service").value;
                const otherService = rfqOtherServiceInput?.value.trim() || "";
                const notes = document.getElementById("client-notes").value || "Standard specification";
                return {name, email, service, otherService, notes};
            }

            rfqForm.addEventListener("submit", (e) => {
                e.preventDefault();
                const {name, email, service, otherService, notes} = getRfqPayload();
                const serviceDescription = service === "Other" && otherService ? `Other — ${otherService}` : service;
                const subject = encodeURIComponent(`RFQ: ${serviceDescription} — ${name}`);
                const body = encodeURIComponent(`Client/Org: ${name}\nEmail: ${email}\nService Module: ${service}\n${otherService ? `Requested geospatial service: ${otherService}\n` : ""}Project Notes:\n${notes}`);
                window.location.href = `mailto:${GEOPROCESS_CONFIG.email}?subject=${subject}&body=${body}`;
            });

            rfqWaBtn.addEventListener("click", () => {
                if (!rfqForm.reportValidity()) return;
                const {name, email, service, otherService, notes} = getRfqPayload();
                const serviceDescription = service === "Other" && otherService ? `Other — ${otherService}` : service;
                const text = encodeURIComponent(`*New Project RFQ — GeoProcess Consulting*\n*Name:* ${name}\n*Email:* ${email}\n*Module:* ${serviceDescription}\n*Scope:* ${notes}`);
                window.open(`https://wa.me/${GEOPROCESS_CONFIG.whatsappNumber}?text=${text}`, "_blank", "noopener,noreferrer");
            });
        });
