import { h } from "preact";
import { css } from "emotion";
import Logo from "../common/Logo";
import Button from "../common/Button";
import Heading from "../common/Heading";
import Article from "../common/Article";

const buttonGroups = css`
  display: flex;
  flex-direction: row;
  align-items: center;
`;

export default function () {
  return (
    <Article ariaLabel="Register New Wallet">
      <Heading number={3}>Make a BCH wallet to use everywhere!</Heading>
      <Logo block />
      <p>
        Signup is a non-custodial <b>Bitcoin Cash</b> wallet. With Signup you
        can interact with different web apps or just send and recieve BCH in
        web.
      </p>

      <Button linkTo={"/new-wallet"} primary>
        Create a new wallet
      </Button>
      <Button linkTo={"/import"} secondary>
        Import an existing wallet
      </Button>

      <Heading number={4}>Free the market, free the world.</Heading>
    </Article>
  );
}
