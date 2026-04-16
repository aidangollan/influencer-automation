"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Step, FlowState, Scene, ScenePlan, ChatMessage } from "@/types";

type FlowContextValue = FlowState & {
  setStep: (step: Step) => void;
  setReelUrl: (url: string) => void;
  setProductInfo: (info: string) => void;
  setProductUrl: (url: string) => void;
  setInfluencerImage: (image: string | null) => void;
  setScriptLines: (lines: string[]) => void;
  setScenePlans: (plans: ScenePlan[]) => void;
  setProductImages: (images: string[]) => void;
  setProductSummary: (summary: string) => void;
  updateScriptLine: (index: number, text: string) => void;
  addScriptLine: () => void;
  removeScriptLine: (index: number) => void;
  setIsGeneratingScript: (v: boolean) => void;
  setGenerationStatus: (s: string) => void;
  setScenes: (scenes: Scene[]) => void;
  updateScene: (id: string, updates: Partial<Scene>) => void;
  setFinalVideoUrl: (url: string | null) => void;
  chatMessages: ChatMessage[];
  addChatMessage: (message: ChatMessage) => void;
  resetFlow: () => void;
};

const initialState: FlowState = {
  step: 1,
  reelUrl: "",
  productInfo: "",
  productUrl: "",
  influencerImage: null,
  scriptLines: [],
  scenePlans: [],
  productImages: [],
  productSummary: "",
  scenes: [],
  finalVideoUrl: null,
  isGeneratingScript: false,
  generationStatus: "",
};

const FlowContext = createContext<FlowContextValue | null>(null);

export function FlowProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FlowState>(initialState);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const setStep = useCallback((step: Step) => {
    setState((prev) => ({ ...prev, step }));
  }, []);

  const setReelUrl = useCallback((reelUrl: string) => {
    setState((prev) => ({ ...prev, reelUrl }));
  }, []);

  const setProductInfo = useCallback((productInfo: string) => {
    setState((prev) => ({ ...prev, productInfo }));
  }, []);

  const setProductUrl = useCallback((productUrl: string) => {
    setState((prev) => ({ ...prev, productUrl }));
  }, []);

  const setInfluencerImage = useCallback((influencerImage: string | null) => {
    setState((prev) => ({ ...prev, influencerImage }));
  }, []);

  const setScriptLines = useCallback((scriptLines: string[]) => {
    setState((prev) => ({ ...prev, scriptLines }));
  }, []);

  const setScenePlans = useCallback((scenePlans: ScenePlan[]) => {
    setState((prev) => ({ ...prev, scenePlans }));
  }, []);

  const setProductImages = useCallback((productImages: string[]) => {
    setState((prev) => ({ ...prev, productImages }));
  }, []);

  const setProductSummary = useCallback((productSummary: string) => {
    setState((prev) => ({ ...prev, productSummary }));
  }, []);

  const updateScriptLine = useCallback((index: number, text: string) => {
    setState((prev) => ({
      ...prev,
      scriptLines: prev.scriptLines.map((line, i) =>
        i === index ? text : line
      ),
    }));
  }, []);

  const addScriptLine = useCallback(() => {
    setState((prev) => ({
      ...prev,
      scriptLines: [...prev.scriptLines, ""],
    }));
  }, []);

  const removeScriptLine = useCallback((index: number) => {
    setState((prev) => ({
      ...prev,
      scriptLines: prev.scriptLines.filter((_, i) => i !== index),
    }));
  }, []);

  const setIsGeneratingScript = useCallback((isGeneratingScript: boolean) => {
    setState((prev) => ({ ...prev, isGeneratingScript }));
  }, []);

  const setGenerationStatus = useCallback((generationStatus: string) => {
    setState((prev) => ({ ...prev, generationStatus }));
  }, []);

  const setScenes = useCallback((scenes: Scene[]) => {
    setState((prev) => ({ ...prev, scenes }));
  }, []);

  const updateScene = useCallback((id: string, updates: Partial<Scene>) => {
    setState((prev) => ({
      ...prev,
      scenes: prev.scenes.map((scene) =>
        scene.id === id ? { ...scene, ...updates } : scene
      ),
    }));
  }, []);

  const setFinalVideoUrl = useCallback((finalVideoUrl: string | null) => {
    setState((prev) => ({ ...prev, finalVideoUrl }));
  }, []);

  const addChatMessage = useCallback((message: ChatMessage) => {
    setChatMessages((prev) => [...prev, message]);
  }, []);

  const resetFlow = useCallback(() => {
    setState(initialState);
    setChatMessages([]);
  }, []);

  return (
    <FlowContext.Provider
      value={{
        ...state,
        setStep,
        setReelUrl,
        setProductInfo,
        setProductUrl,
        setInfluencerImage,
        setScriptLines,
        setScenePlans,
        setProductImages,
        setProductSummary,
        updateScriptLine,
        addScriptLine,
        removeScriptLine,
        setIsGeneratingScript,
        setGenerationStatus,
        setScenes,
        updateScene,
        setFinalVideoUrl,
        chatMessages,
        addChatMessage,
        resetFlow,
      }}
    >
      {children}
    </FlowContext.Provider>
  );
}

export function useFlow() {
  const context = useContext(FlowContext);
  if (!context) {
    throw new Error("useFlow must be used within a FlowProvider");
  }
  return context;
}
