"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/** Fundo 3D ambiente (estrelas + montanhas + nebulosa) — versão simplificada do
 * "horizon-hero-section", sem a parte de scroll entre seções (não se aplica
 * numa tela de login, que não rola). */
export function SpaceBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.00025);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(0, 20, 100);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Estrelas
    const starGeo = new THREE.BufferGeometry();
    const starCount = 3000;
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const radius = 200 + Math.random() * 800;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.2, transparent: true, opacity: 0.8 });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // Montanhas (camadas com paralaxe)
    const mountains: THREE.Mesh[] = [];
    const layers = [
      { distance: -50, height: 60, color: 0x1e293b },
      { distance: -100, height: 80, color: 0x334155 },
      { distance: -150, height: 100, color: 0x0f172a },
    ];
    layers.forEach((layer) => {
      const points: THREE.Vector2[] = [];
      const segments = 40;
      for (let i = 0; i <= segments; i++) {
        const x = (i / segments - 0.5) * 1000;
        const y = Math.sin(i * 0.15) * layer.height + Math.random() * layer.height * 0.2 - 60;
        points.push(new THREE.Vector2(x, y));
      }
      points.push(new THREE.Vector2(500, -300));
      points.push(new THREE.Vector2(-500, -300));
      const shape = new THREE.Shape(points);
      const geometry = new THREE.ShapeGeometry(shape);
      const material = new THREE.MeshBasicMaterial({ color: layer.color, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.z = layer.distance;
      scene.add(mesh);
      mountains.push(mesh);
    });

    // Nebulosa (leve, tons vermelho/azul combinando com o tema)
    const nebulaGeo = new THREE.PlaneGeometry(4000, 2000, 1, 1);
    const nebulaMat = new THREE.MeshBasicMaterial({
      color: 0xdc2626,
      transparent: true,
      opacity: 0.06,
      side: THREE.DoubleSide,
    });
    const nebula = new THREE.Mesh(nebulaGeo, nebulaMat);
    nebula.position.z = -600;
    scene.add(nebula);

    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const t = Date.now() * 0.00005;
      stars.rotation.y = t;
      mountains.forEach((m, i) => {
        m.position.x = Math.sin(Date.now() * 0.0001 + i) * 3;
      });
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      starGeo.dispose();
      starMat.dispose();
      mountains.forEach((m) => {
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      });
      nebulaGeo.dispose();
      nebulaMat.dispose();
      renderer.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 z-0" />;
}
