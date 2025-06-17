/* eslint-disable @typescript-eslint/no-explicit-any */
import { createContext, useContext } from "react";

export type JupyterConnectivityState = {
  mode: "jupyter-server" | "jupyterlab-extension";
  jupyterServerUrl: string;
  jupyterServerToken: string;
  jupyterServerIsAvailable: boolean;
  refreshJupyter: () => void;
  setJupyterServerUrl: (newUrl: string) => void;
  setJupyterServerToken: (newToken: string) => void;
  extensionKernel?: any;
  numActiveKernels: number;
};

export const JupyterConnectivityContext =
  createContext<JupyterConnectivityState>({
    mode: "jupyter-server",
    jupyterServerUrl: "http://localhost:8888",
    jupyterServerToken: "",
    jupyterServerIsAvailable: false,
    refreshJupyter: () => {},
    setJupyterServerUrl: () => {},
    setJupyterServerToken: () => {},
    extensionKernel: undefined,
    numActiveKernels: 0,
  });

export const tokenForPublicServer = (serverName: string) => {
  try {
    const publicServerTokens = localStorage.getItem("public-server-tokens");
    if (publicServerTokens) {
      const tokens = JSON.parse(publicServerTokens);
      return tokens[serverName];
    }
  } catch (e) {
    console.error("Failed to get public server token", e);
  }
  return "";
};

export const setTokenForPublicServer = (serverName: string, token: string) => {
  try {
    const publicServerTokens = localStorage.getItem("public-server-tokens");
    const tokens = publicServerTokens ? JSON.parse(publicServerTokens) : {};
    tokens[serverName] = token;
    localStorage.setItem("public-server-tokens", JSON.stringify(tokens));
  } catch (e) {
    console.error("Failed to set public server token", e);
  }
};

export const useJupyterConnectivity = () => {
  const context = useContext(JupyterConnectivityContext);
  if (!context) {
    throw new Error(
      "useJupyterConnectivity must be used within a JupyterConnectivityProvider",
    );
  }
  return context;
};
