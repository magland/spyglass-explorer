/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  FunctionComponent,
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { JupyterConnectivityContext } from "./JupyterConnectivity";

export const JupyterConnectivityProvider: FunctionComponent<
  PropsWithChildren<{
    mode: "jupyter-server" | "jupyterlab-extension";
    extensionKernel?: any;
  }>
> = ({ children, mode, extensionKernel }) => {
  const [jupyterServerUrl, setJupyterServerUrl] = useState("");
  const [jupyterServerToken, setJupyterServerToken] = useState("");

  const [jupyterServerIsAvailable, setJupyterServerIsAvailable] =
    useState(false);
  const [numActiveKernels, setNumActiveKernels] = useState(0);

  const check = useCallback(async () => {
    if (!jupyterServerUrl) {
      setJupyterServerIsAvailable(false);
      return;
    }
    if (mode === "jupyter-server") {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const headers: { [key: string]: string } = {
          "Content-Type": "application/json",
        };
        if (jupyterServerToken) {
          headers["Authorization"] = `token ${jupyterServerToken}`;
        }
        const resp = await fetch(`${jupyterServerUrl}/api/kernels`, {
          method: "GET",
          // apparently it's import to specify the header here, otherwise it seems the header fields can violate CORS
          headers,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (resp.ok) {
          const kernels = await resp.json();
          setJupyterServerIsAvailable(true);
          setNumActiveKernels(kernels.length);
        } else {
          console.error("Failed to fetch kernels", resp);
          setJupyterServerIsAvailable(false);
          setNumActiveKernels(0);
        }
      } catch (e: any) {
        console.error("Failed to fetch kernels *", e);
        setJupyterServerIsAvailable(false);
        setNumActiveKernels(0);
      }
    } else if (mode === "jupyterlab-extension") {
      setJupyterServerIsAvailable(!!extensionKernel);
    }
  }, [jupyterServerUrl, jupyterServerToken, mode, extensionKernel]);

  const [refreshCode, setRefreshCode] = useState(0);

  useEffect(() => {
    check();
  }, [check, refreshCode]);

  const refreshJupyter = useCallback(() => setRefreshCode((c) => c + 1), []);

  const value = useMemo(
    () => ({
      mode,
      jupyterServerUrl,
      jupyterServerToken,
      jupyterServerIsAvailable,
      refreshJupyter,
      setJupyterServerUrl,
      setJupyterServerToken,
      extensionKernel,
      numActiveKernels,
    }),
    [
      mode,
      jupyterServerUrl,
      jupyterServerToken,
      jupyterServerIsAvailable,
      refreshJupyter,
      setJupyterServerUrl,
      setJupyterServerToken,
      extensionKernel,
      numActiveKernels,
    ],
  );

  return (
    <JupyterConnectivityContext.Provider value={value}>
      {children}
    </JupyterConnectivityContext.Provider>
  );
};
