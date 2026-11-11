<template>
  <div class="landing">
    <div class="hero">
      <h1>Modern Interior Room Configurator</h1>
      <p>Design and configure your perfect room with real-time 3D visualization</p>
      <router-link to="/configurator" class="cta-button">Start Configuring</router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.landing {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.hero {
  text-align: center;
  max-width: 600px;
  padding: 2rem;
}

.hero h1 {
  font-size: 3rem;
  margin-bottom: 1rem;
  font-weight: 700;
}

.hero p {
  font-size: 1.25rem;
  margin-bottom: 2rem;
  opacity: 0.9;
}

.cta-button {
  display: inline-block;
  padding: 1rem 2rem;
  background: white;
  color: #667eea;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 1.1rem;
  transition: transform 0.2s, box-shadow 0.2s;
}

.cta-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}
</style>

