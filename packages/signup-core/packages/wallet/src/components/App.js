import { h, Fragment } from "preact";
import { useEffect, useState } from "preact/hooks";
import Router from "preact-router";
import { ToastContainer } from "react-toastify";
import { css } from "emotion";
import { validateConfig, validateReqType } from "../utils/validators";
import { handleMessageBackToClient, initWorker } from "../signer";
import NewWallet from "./new-wallet/NewWallet";
import Topup from "./wallet/Topup";
import Send from "./wallet/Send";
import Backup from "./wallet/Backup";
import Logout from "./wallet/Logout";

import Home from "./home/Home";
import WithUtxos from "./WithUtxos";

import "../css/base.css";

function App() {
  const [clientPayload, setClientPayload] = useState({});
  let nonce = 0;

  useEffect(() => {
    function receiveMessage(event) {
      console.log("[SIGNUP] event received", event.data);
      nonce++;
      const requestOrigin = event.origin.replace(/https?:\/\//, "");
      const { reqType, reqId, config, budget, deadline } = event.data;

      validateConfig(config);
      validateReqType(reqType);
      setClientPayload({ ...event.data, origin: event.origin, nonce });
    }

    if (window) {
      window.addEventListener("message", receiveMessage, false);
      // send a message back to confirm this is ready
      handleMessageBackToClient("READY", null);
    }

    initWorker();
  }, []);

  return (
    <>
      <Router>
        <Home path="/" clientPayload={clientPayload} />
        <NewWallet path="/new-wallet" clientPayload={clientPayload} />
        <Topup path="/top-up" clientPayload={clientPayload} />
        <Send path="/send" clientPayload={clientPayload} />
        <Backup path="/backup" />
        <Logout path="/logout" />
      </Router>

      <ToastContainer position="bottom-center" draggable />
    </>
  );
}

export default WithUtxos(App);
