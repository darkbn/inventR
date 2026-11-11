import path from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');

  /**
   * Noms d'hôtes acceptés par le serveur de développement, séparés par des
   * virgules (`DEV_ALLOWED_HOSTS` dans `apps/web/.env.local`).
   *
   * Vite refuse les requêtes dont l'en-tête `Host` ne figure pas dans cette
   * liste — c'est une protection contre le DNS rebinding, pas une tracasserie.
   * Sans elle, un site tiers pourrait faire résoudre son domaine vers
   * 127.0.0.1 et piloter le serveur de développement depuis le navigateur.
   *
   * La liste est volontairement vide par défaut et renseignée hors du dépôt :
   * un nom d'hôte est propre à une installation, il n'a rien à faire dans la
   * configuration versionnée.
   */
  const allowedHosts = (env.DEV_ALLOWED_HOSTS ?? '')
    .split(',')
    .map((host) => host.trim())
    .filter((host) => host.length > 0);

  return {
    plugins: [react()],
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
    server: {
      // 5273 plutôt que le 5173 habituel de Vite : ce port-là est pris par le
      // premier projet Vite venu, et une collision se solde par une application
      // servie à une adresse que ni le routeur, ni le CORS, ni l'APK ne
      // connaissent. Reste surchargeable par `DEV_PORT`.
      port: Number(env.DEV_PORT) || 5273,
      // Sans cela, Vite glisse silencieusement sur le port suivant quand le
      // sien est pris — et l'on se retrouve à servir sur une adresse que
      // personne n'a configurée, ni le proxy, ni le routeur, ni l'APK.
      strictPort: true,
      // Par défaut Vite n'écoute que sur la boucle locale : le serveur est
      // alors injoignable depuis un autre appareil, même port ouvert sur le
      // routeur. `host: true` le fait écouter sur toutes les interfaces.
      host: env.DEV_EXPOSE === 'true',
      allowedHosts,
      // L'API est jointe via un proxy : le navigateur voit une origine unique,
      // ce qui évite d'avoir à assouplir le CORS côté API. Conséquence utile
      // lorsqu'on expose le poste : un seul port suffit, l'API n'a pas à être
      // publiée séparément.
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET || 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      rollupOptions: {
        output: {
          // Découpage par bibliothèque : l'application est consultée depuis des
          // tablettes sur le Wi-Fi de l'entrepôt. Isoler Recharts — chargé par le
          // seul tableau de bord — évite d'imposer son poids à l'écran de
          // connexion comme aux listes de comptage.
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            query: ['@tanstack/react-query', '@tanstack/react-table', 'axios'],
            charts: ['recharts'],
            forms: ['react-hook-form', '@hookform/resolvers', 'zod'],
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
    },
  };
});
