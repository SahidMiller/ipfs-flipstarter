import { h } from "preact";
import { css, cx } from "emotion";
import logoPurple from "../../assets/signup-logo.png";
import logoWhite from "../../assets/signup-logo-white-transparent.png";

export default function ({ block }) {
  let logoContainer = css`
    margin: 16px 0;
  `;
  let logoStyle = css`
    color: #7c3aed;
    text-align: center;
    text-decoration: none;
    width: 100px;
  `;

  if (block) {
    logoContainer = css`
      display: flex;
      width: 170px;
      height: 150px;
      background: #7c3aed;
      justify-content: center;
      user-select: none;
      margin: 32px;
    `;
    logoStyle = cx(
      logoStyle,
      css`
        color: white;
        width: 100%;
        text-align: center;
        font-size: 40px;
        font-weight: 500;
        align-self: center;
        margin: 0;
      `
    );
  }
  return (
    <span class={logoContainer} aria-label="SIGNUP Logo">
      <img src={block ? logoWhite : logoPurple} class={logoStyle} />
    </span>
  );
}
