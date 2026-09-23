import React from "react";
import { Button } from "react-bootstrap";
import { queryCollectionByTradeCountScaled, queryNft } from "./api";
import SideScroller from "./SideScroller";
import CollectionCard from "./CollectionCard";
import NFTCard from "./NFTCard";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPiggyBank,
  faLock,
  faHandHoldingUsd,
  faWallet,
  faChevronDown,
  faHandSparkles,
} from "@fortawesome/free-solid-svg-icons";
import CustomDivider from "./CustomDivider";
import FadeInSection from "./FadeInSection";
import { getPlatformStats } from "./api";
import { toLocaleString, link } from "./utils";

function Main() {
  const [platformStats, setPlatformStats] = React.useState(null);
  const [hotCollections, setHotCollections] = React.useState(null);
  const [newNfts, setNewNfts] = React.useState(null);
  const [recentNfts, setRecentNfts] = React.useState(null);

  React.useEffect(() => {
    (async () => {
      setHotCollections((await queryCollectionByTradeCountScaled(20)).results);
      setNewNfts(
        (
          await queryNft({
            key: "listHeight",
            direction: "DESC",
            limit: 25,
            offset: 0,
          })
        ).results
      );
      setRecentNfts(
        (
          await queryNft({
            key: "tradeHeight",
            direction: "DESC",
            limit: 25,
            offset: 0,
          })
        ).results
      );
    })();
  }, []);

  React.useEffect(() => {
    (async () => {
      // Always use.
      setPlatformStats(await getPlatformStats());
    })();
  }, []);

  return (
    <div className="d-flex flex-column">
      <div className="mt-4 mb-2 p-4">
        <h2 className="accent overview-title">Hot collections 🔥</h2>
        <SideScroller
          defaultHeight="16.2rem"
          items={hotCollections}
          itemTemplate={(x) => (
            <li key={x}>
              <a href={link(`/collection/${x}`)}>
                <CollectionCard handle={x} />
              </a>
            </li>
          )}
        />
      </div>
      <div className="mb-2 p-4">
        <h2 className="accent overview-title">Newly listed ✨</h2>
        <SideScroller
          defaultHeight="24.8rem"
          items={newNfts}
          itemTemplate={(x) => (
            <li key={x}>
              <a href={link(`/nft/${x}`)}>
                <NFTCard address={x} />
              </a>
            </li>
          )}
        />
      </div>
      <div className="mb-2 p-4">
        <h2 className="accent overview-title">Recently sold 💰</h2>
        <SideScroller
          defaultHeight="24.8rem"
          items={recentNfts}
          itemTemplate={(x) => (
            <li key={x}>
              <a href={link(`/nft/${x}`)}>
                <NFTCard address={x} />
              </a>
            </li>
          )}
        />
      </div>
      <div className="d-flex flex-row">
        <div className="isometric-holder">
          <div className="isometric"></div>
        </div>
      </div>
      <h1 className="mx-auto mt-5 accent">Dingocoin NFT Platform</h1>
      <p className="mx-auto mb-4">The next generation of NFTs</p>
      <div className="d-flex flex-row text-center justify-content-center flex-wrap d-none d-md-flex d-lg-flex d-xl-flex">
        <div className="project-card">
          <div className="logo-holder">
            <FontAwesomeIcon className="faicon" icon={faPiggyBank} />
          </div>
          <h5>Ultra-low Costs</h5>
          <p>Create and trade NFTs with {"<$0.001"} gas fees</p>
        </div>
        <div className="project-card">
          <div className="logo-holder">
            <FontAwesomeIcon className="faicon" icon={faHandHoldingUsd} />
          </div>
          <h5>On-chain Trading</h5>
          <p>You receive earnings and royalties immediately</p>
        </div>
        <div className="project-card">
          <div className="logo-holder">
            <FontAwesomeIcon className="faicon" icon={faLock} />
          </div>
          <h5>Cryptographically Unique</h5>
          <p>The same content can never be reused in another NFT</p>
        </div>
      </div>
      <div className="d-flex flex-row projectFactsWrap">
        <div className="item mt-2 mx-auto">
          <p className="number">
            {platformStats === null && "-"}
            {platformStats !== null && (
              `${toLocaleString(platformStats.totalVolume)} DINGO`
            )}
          </p>
          <span></span>
          <p>Total trade volume</p>
        </div>
      </div>
      <h2 className="text-center mt-5 accent">GET STARTED</h2>
      <CustomDivider />
      <FadeInSection>
        <div className="getting-started-section mt-4 mb-5 mx-auto px-5">
          <div className="banner-holder">
            <FontAwesomeIcon className="faicon" icon={faWallet} />
          </div>
          <h4 className="mt-3 mb-4">1. Get browser wallet</h4>
          <p className="text-center">
            You need Dingocoin's browser wallet to create and trade NFTs. Take
            less than a minute to set this up.
            <br />
            <br />
            Warning: You must back up your private key,
            <br />
            this is a non-custodial service!
          </p>
          <a href="https://dingocoin.org" target="_blank">
            <Button className="popup-button px-4 py-2 mt-2" variant="primary">
              Visit Dingocoin
            </Button>
          </a>
        </div>
      </FadeInSection>
      <FadeInSection>
        <div className="guide mx-auto">
          <span>
            <FontAwesomeIcon icon={faChevronDown} />
          </span>
        </div>
      </FadeInSection>
      <FadeInSection>
        <div className="getting-started-section mt-5 mb-5 mx-auto px-5">
          <div className="banner-holder">
            <span>✨</span>
          </div>
          <h4 className="mt-3 mb-4">2. Create NFT</h4>
          <p className="text-center">
            Upload your awesome work and start selling it as an NFT today.
          </p>
          <a href={link("/create")}>
            <Button className="popup-button px-4 py-2 mt-2" variant="primary">
              Create your NFT
            </Button>
          </a>
        </div>
      </FadeInSection>
      <FadeInSection>
        <div className="guide mx-auto">
          <span>
            <FontAwesomeIcon icon={faChevronDown} />
          </span>
        </div>
      </FadeInSection>
      <FadeInSection>
        <div className="getting-started-section mt-5 mb-5 mx-auto px-5">
          <div className="banner-holder">
            <span>💰</span>
          </div>
          <h4 className="mt-3 mb-4">3. Earn</h4>
          <p className="text-center">
            You receive earnings and royalties immediately upon sale. Sit back
            and relax, and watch your glorious work take off.
          </p>
        </div>
      </FadeInSection>
      <FadeInSection>
        <div className="guide mx-auto">
          <span>
            <FontAwesomeIcon icon={faChevronDown} />
          </span>
        </div>
      </FadeInSection>
      <FadeInSection>
        <div className="getting-started-section mt-5 mb-5 mx-auto px-5">
          <div className="banner-holder">
            <span>🔍</span>
          </div>
          <h4 className="mt-3 mb-4">4. Explore</h4>
          <p className="text-center">
            Check out the phenomenal creations by others. Buy and sell work
            worthy of praise and appreciation.
          </p>
          <a href={link("/collections")}>
            <Button className="popup-button px-4 py-2 mt-2" variant="primary">
              Explore collections
            </Button>
          </a>
        </div>
      </FadeInSection>
    </div>
  );
}

export default Main;
