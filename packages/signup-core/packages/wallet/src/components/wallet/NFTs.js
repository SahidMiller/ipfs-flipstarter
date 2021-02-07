import { h, Fragment } from "preact";
import { useState, useEffect } from "preact/hooks";
import { Link, route } from "preact-router";
import axios from "axios";
import { css } from "emotion";
import Logo from "../common/Logo";
import Article from "../common/Article";
import Heading from "../common/Heading";
import Button from "../common/Button";
import {
  SLP_ICONS_URL,
  WAIFU_NFT_IMAGE_SERVER,
  WAIFU_GROUP_ID,
} from "../../config";
import { getSlpBalances, getSlpByTokenId } from "../../utils/slp";
import { getWalletSLPAddr } from "../../utils/wallet";
import Loading from "../common/Loading";
import NFTImage from "./NFTImage";

const nftGroupCss = css`
  display: flex;
  flex-direction: column;
  width: 100%;
`;

const rowCss = css`
  display: flex;
  flex-direction: row;
  width: 90%;
  padding: 15px 10px;
  margin-bottom: 15px;
  cursor: pointer;

  &:hover {
    background: #ae7fff;
    & h4 {
      color: white;
    }
    & h5 {
      color: white;
      background: #6a15fd;
    }
  }
`;

export default function () {
  const [slpBalances, setSlpBalances] = useState([]);
  const [nftGroups, setNftGroups] = useState([]);
  const [isFetching, setIsFetching] = useState(false);

  async function fetchNftGroups(slpBalances) {
    const groups = Array.from(new Set(slpBalances.map((x) => x.nftParentId)));
    // fetch each parent metadata
    let nftGroups = [];
    await Promise.all(
      groups.map(async (group) => {
        if (!group) return;

        const tokenData = await getSlpByTokenId(group);

        if (tokenData && tokenData.tokenId) {
          nftGroups.push(tokenData);
        }
      })
    );
    setNftGroups(nftGroups);
    return Promise.resolve();
  }

  useEffect(() => {
    setIsFetching(true);
    (async () => {
      const slpAddr = await getWalletSLPAddr();
      if (!slpAddr) return;

      const { data } = await getSlpBalances(slpAddr);
      // g is for Graph collection of SLP db
      setSlpBalances(data.g);
      await fetchNftGroups(data.g);
      setIsFetching(false);
    })();
  }, []);
  return (
    <>
      <header>
        <Link href="/top-up">{`< Back to Topup`}</Link>
      </header>
      <main>
        <Article ariaLabel="Your NFTs">
          <Heading number={2}>NFTs 👾</Heading>
          {isFetching && <Loading text="Loading your NFTs... 🥁" />}

          {nftGroups.map((group) => (
            <div class={nftGroupCss}>
              <Heading
                number={3}
                customCss={css`
                  margin-bottom: 0;
                  padding-bottom: 0;
                `}
              >
                {group.name}
              </Heading>
              <p
                class={css`
                  font-size: 0.9em;
                  margin-left: 28px;
                  margin-top: 0;
                  color: #c28fff;
                `}
              >
                {group.ticker}
              </p>
              {slpBalances
                .filter((x) => x.versionType == "65")
                .filter((x) => x.nftParentId === group.tokenId)
                .map((token) => (
                  <div
                    class={rowCss}
                    onClick={() => route(`/token?tokenId=${token.tokenId}`)}
                  >
                    <div
                      class={css`
                        align-self: center;
                        margin-right: 16px;
                      `}
                    >
                      <NFTImage token={token} parentId={group.tokenId} />
                    </div>
                    <div>
                      <Heading
                        customCss={css`
                          color: black;
                          cursor: pointer;
                        `}
                        number={4}
                      >
                        {token.name}
                      </Heading>
                      {token.ticker && (
                        <Heading
                          highlight
                          customCss={css`
                            cursor: pointer;
                          `}
                          number={5}
                        >
                          {`${token.ticker}`}
                        </Heading>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          ))}
        </Article>
      </main>
    </>
  );
}