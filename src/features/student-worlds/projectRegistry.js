import { createContext, lazy } from 'react';
import { worldCatalog, worldTheme } from './worldCatalog.js';
import { worldConfigs } from './worldConfigs.js';

// Each project owns its catalog/configs and lazy scene bundle; the explorer is shared.
export function defineDrawingProject({ id, title, worlds, configs, loadScenes, description, featuredDescription }) {
  if (!id || !title || !worlds?.length || typeof loadScenes !== 'function') throw new Error('Invalid drawing project');
  const ids = new Set();
  const scenes = {};
  for (const world of worlds) {
    if (!world.id || ids.has(world.id)) throw new Error(`Duplicate/missing world ID in ${id}`);
    ids.add(world.id);
    if (!world.scene) continue;
    const config = configs?.[world.scene];
    if (!config?.spawn || !config.bounds || !Array.isArray(config.map) || typeof config.floorAt !== 'function' || typeof config.isSwimming !== 'function') throw new Error(`Missing world config: ${id}/${world.id}`);
    scenes[world.scene] ||= lazy(async () => {
      const module = await loadScenes();
      const component = module.default[world.scene];
      if (!component) throw new Error(`Missing scene: ${id}/${world.scene}`);
      return { default: component };
    });
  }
  return { id, title, worlds, configs, scenes, description, featuredDescription };
}

export const defaultProject = defineDrawingProject({
  id: worldTheme.id, title: worldTheme.title, worlds: worldCatalog, configs: worldConfigs,
  loadScenes: () => import('./summerScenes.jsx'),
  description: '종이 위의 여름이 걸어 들어갈 수 있는 세계가 됩니다.',
  featuredDescription: '빨강·노랑 튜브와 알록달록 파라솔. 그림 속 해변을 아바타로 걸어 보세요.',
});

// Register additional project definitions here. World IDs only need to be unique within a project.
export const drawingProjects = [defaultProject];
export function getDrawingProject(id) {
  return drawingProjects.find(project => project.id === id) || defaultProject;
}
export const DrawingProjectContext = createContext(defaultProject);
