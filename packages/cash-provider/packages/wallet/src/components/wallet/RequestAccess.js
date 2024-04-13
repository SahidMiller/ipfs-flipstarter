import { h, Fragment } from "preact";
import { useState, useEffect, useContext, useReducer } from "preact/hooks";
import { css } from "emotion";
import {
  handleMessageBackToClient,
  workerCourier,
  onWorkerEvent,
} from "../../signer";
import { makeAccessToken, makeSessionId } from "../../utils/permission";
import { getWalletAddr, getWalletCashAccount } from "../../utils/wallet";
import Heading from "../common/Heading";
import Input from "../common/Input";
import Button from "../common/Button";
import Checkbox from "../common/Checkbox";
import Article from "../common/Article";
import { UtxosContext } from "../WithUtxos";

const permissionCss = css`
  margin: 16px;
  padding: 12px;
  min-height: 350px;
`;

function connectWalletToTxBridge(sessionId) {
  workerCourier("connect", { sessionId });
}

export default function ({ clientPayload, bchAddr }) {
  // TODO move it to higher level using context
  const [status, setStatus] = useState("WAITING");

  useEffect(() => {
    setStatus("WAITING");
  }, [clientPayload.nonce]);

  function handleAllow(e) {
    e.preventDefault();
    (async () => {
      const { permissions } = clientPayload;
      let bchAddr;
      let cashAccount;

      if (permissions.includes("bch_address")) {
        bchAddr = await getWalletAddr();
      }

      if (permissions.includes("cash_account")) {
        cashAccount = await getWalletCashAccount();
      }

      const accessToken = await makeAccessToken(permissions);
      const sessionId = makeSessionId();

      handleMessageBackToClient("GRANTED", clientPayload.reqId, {
        accessToken,
        sessionId,
        bchAddr,
        ...cashAccount,
      });

      connectWalletToTxBridge(sessionId);

      if (permissions.includes("signature")) {
        setStatus("APPROVED");
      } else {
        self.close();
      }
    })();
  }

  function handleDeny() {
    handleMessageBackToClient("DENIED", clientPayload.reqId);
    self.close();
  }

  const { permissions } = clientPayload;

  return (
    <>
      <div class={permissionCss}>
        {status === "WAITING" && (
          <form onSubmit={handleAllow}>
            <Heading number={5}>
              Request for access to these permissions on your wallet:
            </Heading>

            <ul
              class={css`
                color: black;
                font-weight: 500;
                font-size: 15px;
              `}
            >
              {permissions.includes("bch_address") && <li>Your BCH address</li>}
              {permissions.includes("cash_account") && (
                <li>Your Cash Account</li>
              )}
              {permissions.includes("signature") && (
                <li>To sign with your wallet</li>
              )}
            </ul>

            <Heading number={4} inline>
              From:
            </Heading>
            <Heading
              number={4}
              inline
              customCss={css`
                color: black;
                margin: 8px 0;
              `}
            >
              {clientPayload.origin}
            </Heading>
            <div
              class={css`
                display: flex;
                flex-direction: row;
              `}
            ></div>

            <Heading number={4} inline>
              Expires in:
            </Heading>
            <Heading
              number={4}
              inline
              customCss={css`
                color: black;
                margin: 8px 0;
              `}
            >
              1 hour
            </Heading>

            <Button type="submit" primary>
              Allow
            </Button>
            <Button onClick={handleDeny} type="button" secondary>
              Deny
            </Button>
          </form>
        )}

        {status === "APPROVED" && (
          <>
            <Heading number={4}>Access Granted</Heading>
            <Heading number={5} highlight>
              You can now go back to the application. Please keep this window
              open to allow {clientPayload.origin} to sign messages from your
              wallet
            </Heading>
            <p
              class={css`
                margin: 32px 16px;
              `}
            >
              Or simply revert back your permission by clicking the button below
            </p>
            <Button>Revert Back Permission</Button>
          </>
        )}
      </div>
    </>
  );
}
