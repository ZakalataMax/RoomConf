<template>
  <div class="about">
    <div class="about-content">
      <h1>About</h1>
      <section>
        <h2>Technical Overview</h2>
        <p>
          This is a production-ready Modern Interior Room Configurator built with modern web
          technologies and 3D graphics.
        </p>

        <h3>Frontend Stack</h3>
        <ul>
          <li><strong>Vue 3</strong> - Composition API for reactive UI</li>
          <li><strong>TresJS</strong> - Vue wrapper for Three.js</li>
          <li><strong>Pinia</strong> - State management as single source of truth</li>
          <li><strong>TypeScript</strong> - Type safety throughout</li>
          <li><strong>Vite</strong> - Fast build tool and dev server</li>
        </ul>

        <h3>3D Features</h3>
        <ul>
          <li>PBR (Physically Based Rendering) materials</li>
          <li>Real-time lighting configuration</li>
          <li>Environment presets (day, sunset, night)</li>
          <li>Interactive material editing</li>
        </ul>

        <h3>Architecture</h3>
        <p>
          The application follows a clear separation of concerns. The Pinia store serves as the
          single source of truth for all configuration state. UI components reactively bind to
          state, and 3D scene components watch state changes to update Three.js objects. This
          ensures that Three.js objects are never mutated directly from UI components.
        </p>

        <h3>Backend</h3>
        <p>
          A minimal REST API (FastAPI) handles preset persistence. Presets can be saved and loaded
          via standard HTTP endpoints.
        </p>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.about {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  background: #f5f5f5;
}

.about-content {
  max-width: 800px;
  margin: 0 auto;
  padding: 3rem 2rem;
  background: white;
  min-height: 100%;
}

h1 {
  font-size: 2.5rem;
  margin-bottom: 2rem;
  color: #1a1a1a;
}

h2 {
  font-size: 2rem;
  margin-top: 2rem;
  margin-bottom: 1rem;
  color: #333;
}

h3 {
  font-size: 1.5rem;
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
  color: #555;
}

p {
  line-height: 1.6;
  margin-bottom: 1rem;
  color: #666;
}

ul {
  margin-left: 2rem;
  margin-bottom: 1.5rem;
}

li {
  line-height: 1.8;
  margin-bottom: 0.5rem;
  color: #666;
}

strong {
  color: #333;
}
</style>

