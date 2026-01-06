import { VisualizationUpdateEvent } from "shared-types";

export type SessionStatusCallback = (isOpen: boolean) => void;
export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';
export type ConnectionStatusCallback = (status: 'connected' | 'disconnected' | 'reconnecting') => void;
export type VizUpdateCallback = (vizUpdate: VisualizationUpdateEvent) => void;
