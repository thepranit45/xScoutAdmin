// 3D Network Graph using Three.js
// Replaces the 2D Neural Network

class NetworkGraph3D {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });

        this.nodes = [];
        this.connections = [];
        this.studentMap = new Map(); // Map userID -> nodeIndex

        this.init();
        this.animate();

        window.addEventListener('resize', () => this.resize());
    }

    init() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 2); // Soft white light
        this.scene.add(ambientLight);

        const pointLight = new THREE.PointLight(0xffffff, 1, 100);
        pointLight.position.set(10, 10, 10);
        this.scene.add(pointLight);

        this.camera.position.z = 30;

        // Create initial random nodes (simulating 'potential' capacity)
        // or wait for data. Let's create a background starfield effect for ambience first.
        this.createStarfield();
    }

    createStarfield() {
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        for (let i = 0; i < 500; i++) {
            vertices.push(THREE.MathUtils.randFloatSpread(200)); // x
            vertices.push(THREE.MathUtils.randFloatSpread(200)); // y
            vertices.push(THREE.MathUtils.randFloatSpread(100)); // z
        }
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        const material = new THREE.PointsMaterial({ color: 0x888888, size: 0.5, transparent: true, opacity: 0.5 });
        this.starfield = new THREE.Points(geometry, material);
        this.scene.add(this.starfield);
    }

    // Called when telemetry data arrives
    updateData(dataList) {
        // dataList is array of student telemetry objects
        dataList.forEach((data, index) => {
            const id = data.user || data.id || `unknown-${index}`;

            if (!this.studentMap.has(id)) {
                this.addStudentNode(id, data);
            } else {
                this.updateStudentNode(id, data);
            }
        });

        // Optional: Remove stale nodes? Keeping it simple for now (append only)
        this.updateConnections();
    }

    addStudentNode(id, data) {
        const geometry = new THREE.SphereGeometry(1, 32, 32);
        const material = new THREE.MeshStandardMaterial({
            color: 0x00f5ff,
            emissive: 0x00f5ff,
            emissiveIntensity: 0.5,
            roughness: 0.4,
            metalness: 0.6
        });
        const sphere = new THREE.Mesh(geometry, material);

        // Random position within a central cluster
        sphere.position.x = THREE.MathUtils.randFloatSpread(20);
        sphere.position.y = THREE.MathUtils.randFloatSpread(15);
        sphere.position.z = THREE.MathUtils.randFloatSpread(10);

        // Metadata
        sphere.userData = { id: id, velocity: new THREE.Vector3(0, 0, 0) };

        this.scene.add(sphere);
        this.nodes.push(sphere);
        this.studentMap.set(id, sphere);

        // Add a text label (optional, complex in Three.js, using CSS2DObject is better, skipping for simplicity)
    }

    updateStudentNode(id, data) {
        const node = this.studentMap.get(id);
        if (!node) return;

        // Color based on Flow State
        const flowState = data.behavior && data.behavior.flowState ? data.behavior.flowState : 'NORMAL';
        const isOnline = (Date.now() - new Date(data.timestamp).getTime()) < 10000;
        let color = 0x555555; // Offline/Idle default

        if (isOnline) {
            if (flowState === 'FLOW') color = 0x00ff88;      // Green
            else if (flowState === 'DISTRACTED') color = 0xffaa00; // Orange
            else if (flowState === 'NORMAL') color = 0x00f5ff;     // Cyan
            else if (flowState === 'IDLE') color = 0x0044aa;       // Dark Blue

            if (data.ai > 0.5) color = 0xff0000; // High Risk overrides all (Red)
        }

        // Smooth color transition
        node.material.color.lerp(new THREE.Color(color), 0.1);
        node.material.emissive.lerp(new THREE.Color(color), 0.1);

        // Pulse effect if active
        if (isOnline && (flowState === 'FLOW' || data.behavior.wpm > 20)) {
            node.scale.setScalar(1 + Math.sin(Date.now() * 0.005) * 0.2);
        } else {
            node.scale.setScalar(1);
        }
    }

    updateConnections() {
        // Draw lines between nodes to visualize "Classroom Network"
        // Clear old lines
        if (this.lines) {
            this.scene.remove(this.lines);
            this.lines.geometry.dispose();
        }

        if (this.nodes.length < 2) return;

        // Simple mesh: connect every node to its 2 nearest neighbors
        const points = [];
        const positions = this.nodes.map(n => n.position);

        this.nodes.forEach((node, i) => {
            // Find neighbors (simplification: connect to next 2 in array for visual flair)
            for (let j = 1; j <= 2; j++) {
                const neighborIndex = (i + j) % this.nodes.length;
                if (neighborIndex !== i) {
                    points.push(node.position);
                    points.push(this.nodes[neighborIndex].position);
                }
            }
        });

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ color: 0x00f5ff, transparent: true, opacity: 0.15 });
        this.lines = new THREE.LineSegments(geometry, material);
        this.scene.add(this.lines);
    }

    resize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // Slow rotation of the entire graph
        this.scene.rotation.y += 0.001;
        this.starfield.rotation.y -= 0.0005;

        // Floating nodes
        this.nodes.forEach(node => {
            node.position.y += Math.sin(Date.now() * 0.001 + node.position.x) * 0.01;
        });

        // Update lines
        if (this.lines) {
            this.lines.geometry.setFromPoints(
                // Re-calculate points if nodes moved significantly, 
                // but for simple floating, the lines will be slightly rigid unless we update geometry every frame.
                // Let's rely on rigid structure rotating for better perf.
            );
        }

        this.renderer.render(this.scene, this.camera);
    }
}

// Global instance
window.networkGraph = null;

document.addEventListener('DOMContentLoaded', () => {
    // Check if container exists (it should after we update index.html)
    if (document.getElementById('3d-graph-container')) {
        window.networkGraph = new NetworkGraph3D('3d-graph-container');
    }
});
