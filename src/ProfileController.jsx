/* global BigInt */

import {
  Button,
  Form,
  Nav,
  Dropdown,
  DropdownButton,
  Image,
  Spinner
} from "react-bootstrap";
import React from "react";
import Sha256 from "crypto-js/sha256";
import Hex from "crypto-js/enc-hex";
import { getMeta, getState, getProfile, getPreviewLink } from "./storage";
import { toSatoshi, link } from "./utils";
import NFTCard from "./NFTCard";
import {
  createCollection,
  getBusy,
  getBuyTransaction,
  getCollectionItems,
  getContent,
  getItemCollection,
  getProfileCreatedNfts,
  getProfileHistoricalNfts,
  getProfileOwnedNfts,
  getProfileStats,
  getRepriceTransaction,
  queryCollectionByOwner,
  queryUnassignedNftsByOwner,
  sendBuyTransaction,
  sendRepriceTransaction,
  setCollectionItem,
  updateCollection,
  updateProfile,
} from "./api";
import GetWalletModal from "./GetWalletModal";
import CollectionCard from "./CollectionCard";
import CreateCollectionModal from "./CreateCollectionModal";
import EditCollectionModal from "./EditCollectionModal";
import EditProfileModal from "./EditProfileModal";
import { useParams, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { getCollection } from "./storage";
import {
  faCashRegister,
  faExchangeAlt,
  faPlus,
  faPen,
} from "@fortawesome/free-solid-svg-icons";
import { toLocaleString, satoshiToLocaleString } from "./utils";
import ProfileCard from "./ProfileCard";

function ProfileController() {
  const { profileAddress, collectionHandle, nftAddress } = useParams();
  const location = useLocation();
  const view =
    profileAddress !== undefined
      ? location.pathname.endsWith("/owned")
        ? "profileOwned"
        : location.pathname.endsWith("/stats")
        ? "profileStats"
        : "profile"
      : collectionHandle !== undefined
      ? "collection"
      : nftAddress !== undefined
      ? "nft"
      : "unknown";

  // Variables always required.
  const [editProfileShow, setEditProfileShow] = React.useState(null);
  const [profile, setProfile] = React.useState(null);

  // For profile view.
  const [createCollectionShow, setCreateCollectionShow] = React.useState(false);
  const [collections, setCollections] = React.useState(null);
  const [unassignedList, setUnassignedList] = React.useState(null);
  const [profileLists, setProfileLists] = React.useState(null);
  const [profileStats, setProfileStats] = React.useState(null);

  // For collection view.
  const [collection, setCollection] = React.useState(null);
  const [collectionItems, setCollectionItems] = React.useState(null);
  const [editCollectionShow, setEditCollectionShow] = React.useState(false);

  // For NFT view.
  const [nftMeta, setNftMeta] = React.useState(null);
  const [nftState, setNftState] = React.useState(null);
  const [nftItemCollection, setNftItemCollection] = React.useState(undefined);
  const [nftOwner, setNftOwner] = React.useState(undefined);
  const [nftBusy, setNftBusy] = React.useState(undefined);
  const [resellPrice, setResellPrice] = React.useState("");
  const [resellPriceError, setResellPriceError] = React.useState("");
  const [buyResult, setBuyResult] = React.useState(null);
  const [repricePrice, setRepricePrice] = React.useState("");
  const [repricePriceError, setRepricePriceError] = React.useState("");
  const [repriceResult, setRepriceResult] = React.useState(null);
  const [downloadLink, setDownloadLink] = React.useState(null);

  const [getWalletShow, setGetWalletShow] = React.useState(false);

  // Initialize for profile view, commons.
  React.useEffect(() => {
    if (view.startsWith("profile")) {
      (async () => {
        // Retrieve and set profile.
        let profile = await getProfile(profileAddress);
        if (profile === null) {
          profile = {};
        }
        profile.address = profileAddress;
        setProfile(profile);
      })();
    }
  }, []);

  // Initialize for profile view (cretions).
  React.useEffect(() => {
    if (view === "profile") {
      (async () => {
        // Retrieve and set collections.
        const collections = await queryCollectionByOwner({
          owner: profileAddress,
        });
        if (collections !== null) {
          setCollections(collections.reverse());
        }

        // Retrieve and set unassigned list.
        const unassignedList = await queryUnassignedNftsByOwner({
          owner: profileAddress,
        });
        setUnassignedList(unassignedList.reverse());
      })();
    }
  }, []);

  // Initialize for profileOwned view.
  React.useEffect(() => {
    if (view === "profileOwned") {
      (async () => {
        setProfileLists({
          createdNfts: (
            await getProfileCreatedNfts({ owner: profileAddress })
          ).results.reverse(),
          ownedNfts: (
            await getProfileOwnedNfts({ owner: profileAddress })
          ).results.reverse(),
          historicalNfts: (
            await getProfileHistoricalNfts({ owner: profileAddress })
          ).results.reverse(),
        });
      })();
    }
  }, []);

  // Initialize for profileStats view.
  React.useEffect(() => {
    if (view === "profileStats") {
      (async () => {
        setProfileStats(await getProfileStats({ owner: profileAddress }));
        console.log(await getProfileStats({ owner: profileAddress }));
      })();
    }
  }, []);

  // Initialize for collection view.
  React.useEffect(() => {
    (async () => {
      if (view === "collection") {
        const collection = await getCollection(collectionHandle);
        collection.handle = collectionHandle;
        setCollection(collection);
        let profile = await getProfile(collection.owner);
        if (profile === null) {
          profile = {};
        }
        profile.address = collection.owner;
        setProfile(profile);
        setCollectionItems(
          (await getCollectionItems({ handle: collectionHandle })).reverse()
        );
      }
    })();
  }, []);

  // Initialize for nft view.
  React.useEffect(() => {
    (async () => {
      if (view === "nft") {
        const nftMeta = await getMeta(nftAddress);
        setNftMeta(nftMeta);
        const nftState = await getState(nftAddress);
        setNftState(nftState);

        const nftItemCollectionHandle = (
          await getItemCollection({
            address: nftAddress,
          })
        ).handle;
        if (nftItemCollectionHandle === null) {
          setNftItemCollection(null);
        } else {
          const collection = await getCollection(nftItemCollectionHandle);
          collection.handle = nftItemCollectionHandle;
          setNftItemCollection(collection);
        }

        if (nftState !== null && nftState.owner !== nftState.creator) {
          let nftOwner = await getProfile(nftState.owner);
          if (nftOwner === null) {
            nftOwner = {};
          }
          nftOwner.address = nftState.owner;
          setNftOwner(nftOwner);
        } else {
          setNftOwner(null);
        }

        if (nftState !== null && nftMeta !== null) {
          let profile = await getProfile(nftState.creator);
          if (profile === null) {
            profile = {};
          }
          profile.address = nftState.creator;
          setProfile(profile);
        }

        setNftBusy(await getBusy({ address: nftAddress }));
      }
    })();
  }, []);

  // Effect for NFT view.
  React.useEffect(() => {
    if (resellPrice === "") {
      setResellPriceError("Resell price required");
    } else if (nftState !== null) {
      if (
        BigInt(toSatoshi(resellPrice)) >
        BigInt(10) * BigInt(nftState.stats.price)
      ) {
        setResellPriceError(
          `Resell price must be at most 10x the current price`
        );
      } else {
        setResellPriceError("");
      }
    } else {
      setResellPriceError("");
    }
  }, [resellPrice, nftState]);
  React.useEffect(() => {
    if (repricePrice === "") {
      setRepricePriceError("Reduced price required");
    } else {
      setRepricePriceError("");
    }
  }, [repricePrice]);

  const doEditProfileSubmit = async (profile) => {
    if (window.dingo === undefined) {
      setGetWalletShow(true);
      return;
    }

    const payload = {
      timestamp: Date.now(),
      owner: profileAddress,
      name: profile.name,
      thumbnail: profile.thumbnail,
    };
    const message = JSON.stringify(payload);

    const signResult = await window.dingo.requestSign(
      Hex.stringify(Sha256(message))
    );
    if (signResult.error !== undefined) {
      return;
    }
    payload.signature = signResult.result;

    const updateResult = await updateProfile(payload);
    if ("error" in updateResult) {
      return;
    }

    window.location.reload(false);
  };

  const doCreateCollectionSubmit = async (collection) => {
    // Create payload and signature message.
    const payload = {
      timestamp: Date.now(),
      owner: profileAddress,
      handle: collection.handle,
      name: collection.name,
      thumbnail: collection.thumbnail,
      description: collection.description,
    };
    const message = JSON.stringify(payload);

    // Sign.
    const signResult = await window.dingo.requestSign(
      Hex.stringify(Sha256(message))
    );
    if (signResult.error !== undefined) {
      return;
    }
    payload.signature = signResult.result;

    // Send.
    const updateResult = await createCollection(payload);
    if ("error" in updateResult) {
      return;
    }

    window.location.reload(false);
  };

  const doEditCollectionSubmit = async (collection) => {
    // Create payload and signature message.
    const payload = {
      timestamp: Date.now(),
      handle: collection.handle,
      name: collection.name,
      thumbnail: collection.thumbnail,
      description: collection.description,
    };
    const message = JSON.stringify(payload);

    // Sign.
    const signResult = await window.dingo.requestSign(
      Hex.stringify(Sha256(message))
    );
    if (signResult.error !== undefined) {
      return;
    }
    payload.signature = signResult.result;

    // Send.
    const updateResult = await updateCollection(payload);
    if ("error" in updateResult) {
      return;
    }

    window.location.reload(false);
  };

  const doMove = async (address, handle) => {
    // Create payload and signature message.
    const payload = {
      timestamp: Date.now(),
      address: address,
      handle: handle,
    };
    const message = JSON.stringify(payload);

    // Sign.
    const signResult = await window.dingo.requestSign(
      Hex.stringify(Sha256(message))
    );
    if (signResult.error !== undefined) {
      return;
    }
    payload.signature = signResult.result;

    // Send.
    const updateResult = await setCollectionItem(payload);
    if ("error" in updateResult) {
      return;
    }

    window.location.reload(false);
  };

  const doDownload = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (window.dingo === undefined) {
      setGetWalletShow(true);
      return;
    }

    const timestamp = Date.now();
    const message = `${nftAddress}|${timestamp}`;
    const signResult = await window.dingo.requestSign(
      Hex.stringify(Sha256(message))
    );
    if (signResult.error !== undefined) {
      return;
    }

    const result = await getContent({
      address: nftAddress,
      timestamp: timestamp,
      signature: signResult.result,
    });
    if (result === null || result.error !== undefined) {
      return;
    }

    if (result.content !== undefined) {
      setDownloadLink(result.content);
    }
  };

  const doBuy = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (window.dingo === undefined) {
      setGetWalletShow(true);
      return;
    }

    const { vins, vouts } = await getBuyTransaction({
      address: nftAddress,
      price: toSatoshi(resellPrice),
    });
    const signed = (await window.dingo.requestSignTransaction(vins, vouts))
      .result;
    if (signed === null || signed === undefined) {
      return;
    }

    const result = await sendBuyTransaction({ transaction: signed });
    setBuyResult(result);
  };

  const doReprice = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (window.dingo === undefined) {
      setGetWalletShow(true);
      return;
    }

    const { vins, vouts } = await getRepriceTransaction({
      address: nftAddress,
      price: toSatoshi(repricePrice),
    });

    const signed = (await window.dingo.requestSignTransaction(vins, vouts))
      .result;
    if (signed === null || signed === undefined) {
      return;
    }

    const result = await sendRepriceTransaction({ transaction: signed });
    setRepriceResult(result);
  };

  return (
    <div className="profile-container justify-content-center mx-auto">
      {view.startsWith("profile") && profile !== null && (
        <div className="profile-section profile-header pt-3">
          <div className="d-flex flex-row">
            <span
              className="clickable ms-auto"
              onClick={() => setEditProfileShow(true)}
            >
              <FontAwesomeIcon className="me-1" icon={faPen} /> Edit
            </span>
          </div>
          <div className="d-flex flex-row">
            <ul className="profile-cards-container mt-4 mx-auto mb-4">
              <ProfileCard address={profileAddress} />
            </ul>
          </div>
          <hr />
          <Nav variant="tabs" className="custom-nav-tabs">
            <Nav.Item>
              <Nav.Link
                eventKey="creations"
                active={
                  view === "profile" || view === "collection" || view === "nft"
                }
                href={link(`/profile/${profile.address}/`)}
              >
                NFT creations
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link
                eventKey="unassigned"
                active={view === "profileOwned"}
                href={link(`/profile/${profile.address}/owned`)}
              >
                Owned NFTs
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link
                eventKey="unassigned"
                active={view === "profileStats"}
                href={link(`/profile/${profile.address}/stats`)}
              >
                Stats
              </Nav.Link>
            </Nav.Item>
          </Nav>
        </div>
      )}

      {view === "profile" && (
        <div className="profile-section py-3">
          <div className="d-flex flex-row content-header">
            <span className="me-auto content-title accent">Collections</span>
            <span
              className="clickable"
              onClick={() => setCreateCollectionShow(true)}
            >
              <FontAwesomeIcon className="me-1" icon={faPlus} /> Create new
            </span>
          </div>
          {collections !== null && collections.length > 0 && (
            <ul className="collection-cards-container mt-4">
              {collections.map((x) => (
                <a key={x} href={link(`/collection/${x}`)}>
                  <CollectionCard handle={x} />
                </a>
              ))}
            </ul>
          )}
          {collections !== null && collections.length === 0 && (
            <div className="d-flex flex-row mt-2 mb-2">
              <span className="mx-auto text-muted">User has no collection</span>
            </div>
          )}
        </div>
      )}

      {view === "profile" &&
        unassignedList !== null &&
        unassignedList.length > 0 && (
          <div className="profile-section py-3">
            <div className="d-flex flex-row content-header">
              <span className="me-auto content-title accent">
                Unassigned NFTs
              </span>
            </div>
            <ul className="cards-container mt-4">
              {unassignedList.map((x) => (
                <div key={x}>
                  <a href={link(`/nft/${x}`)}>
                    <NFTCard address={x} />
                  </a>
                  <DropdownButton
                    className="mt-2 mb-4 px-4"
                    title="Move to collection"
                  >
                    {collections !== null &&
                      collections.map((y) => (
                        <Dropdown.Item key={y} onClick={() => doMove(x, y)}>
                          {y}
                        </Dropdown.Item>
                      ))}
                  </DropdownButton>
                </div>
              ))}
            </ul>
          </div>
        )}

      {view === "profileOwned" && profileLists !== null && (
        <div className="profile-section py-3">
          <div className="d-flex flex-row content-header">
            <span className="me-auto content-title accent">Owned NFTs</span>
          </div>
          {profileLists.ownedNfts.filter(
            (x) => !profileLists.createdNfts.some((y) => y === x)
          ).length > 0 && (
            <ul className="cards-container mt-4">
              {profileLists.ownedNfts
                .filter((x) => !profileLists.createdNfts.some((y) => y === x))
                .map((x) => (
                  <a key={x} href={link(`/nft/${x}`)}>
                    <NFTCard address={x} />
                  </a>
                ))}
            </ul>
          )}
          {profileLists.ownedNfts.filter(
            (x) => !profileLists.createdNfts.some((y) => y === x)
          ).length === 0 && (
            <div className="d-flex flex-row mt-2 mb-2">
              <span className="mx-auto text-muted">User has no owned NFT</span>
            </div>
          )}
        </div>
      )}

      {view === "profileOwned" &&
        profileLists !== null &&
        profileLists.historicalNfts
          .filter((x) => !profileLists.createdNfts.some((y) => y === x))
          .filter((x) => !profileLists.ownedNfts.some((y) => y === x)).length >
          0 && (
          <div className="profile-section py-3">
            <div className="d-flex flex-row content-header">
              <span className="me-auto content-title accent">
                Previously owned NFTs
              </span>
            </div>
            <ul className="cards-container mt-4">
              {profileLists.historicalNfts
                .filter((x) => !profileLists.createdNfts.some((y) => y === x))
                .filter((x) => !profileLists.ownedNfts.some((y) => y === x))
                .map((x) => (
                  <a key={x} href={link(`/nft/${x}`)}>
                    <NFTCard address={x} />
                  </a>
                ))}
            </ul>
          </div>
        )}

      {view === "profileStats" && profileStats !== null && (
        <div className="profile-section py-3">
          <div className="d-flex flex-row content-header">
            <span className="me-auto content-title accent">Profile Stats</span>
          </div>
          <div className="mt-4 px-2">
            <p>
              <b>NFT creations</b>
              <ul>
                <li>NFTs created: {profileStats.listCount}</li>
                <li>Times sold: {profileStats.listSoldCount}</li>
                <li>
                  Total royalties:{" "}
                  {satoshiToLocaleString(profileStats.royaltyVolume)}
                </li>
              </ul>
            </p>

            <p>
              <b>Trades</b>
              <ul>
                <li>NFTs bought/sold: {profileStats.tradeCount}</li>
                <li>
                  Total purchases:{" "}
                  {satoshiToLocaleString(profileStats.buyVolume)}
                </li>
                <li>
                  Total sales: {satoshiToLocaleString(profileStats.sellVolume)}
                </li>
              </ul>
            </p>

            <p>
              <b>Overall</b>
              <ul>
                <li>
                  Total Earnings:{" "}
                  {satoshiToLocaleString(
                    BigInt(profileStats.royaltyVolume) +
                      BigInt(profileStats.sellVolume) -
                      BigInt(profileStats.buyVolume)
                  )}
                </li>
              </ul>
            </p>
          </div>
        </div>
      )}

      {view === "collection" && collection !== null && (
        <div className="profile-section py-3">
          {profile !== null && (
            <div className="d-flex flex-row content-header">
              <div
                className="text-truncate me-auto"
                style={{ display: "inline" }}
              >
                <span className="content-title accent">Collection by: </span>
                <a
                  className="simple-link"
                  href={link(`/profile/${profile.address}/`)}
                >
                  {profile.name === "" ||
                  profile.name === null ||
                  profile.name === undefined
                    ? profile.address
                    : profile.name}
                </a>
              </div>
              <span
                className="clickable ms-auto"
                onClick={() => setEditCollectionShow(true)}
              >
                <nobr>
                  <FontAwesomeIcon className="me-1" icon={faPen} /> Edit
                </nobr>
              </span>
            </div>
          )}
          <div className="d-flex flex-row">
            <ul className="collection-cards-container mt-4 mx-auto mb-4">
              <CollectionCard handle={collectionHandle} />
            </ul>
          </div>
        </div>
      )}
      {view === "collection" && collection !== null && (
        <div className="profile-section py-3">
          <ul className="cards-container mt-4">
            {collectionItems !== null &&
              collectionItems.map((x) => (
                <a key={x} href={link(`/nft/${x}`)}>
                  <NFTCard address={x} />
                </a>
              ))}
          </ul>
        </div>
      )}

      {view === "nft" && nftMeta !== null && nftItemCollection !== undefined && (
        <div className="profile-section-transparent">
          <div className="d-flex flex-row nft-container flex-wrap">
            <Image className="mx-0 my-auto" src={getPreviewLink(nftAddress)} />
            <hr />
            {nftState === null && (
              <div className="px-3 py-3 details d-flex flex-column flex-fill">
                <Spinner className="mx-auto my-auto" animation="border"/>
              </div>
            )}
            {nftState !== null && (
              <div className="px-3 py-3 details d-flex flex-column flex-fill">
                <h2 className="accent">{nftMeta.name}</h2>
                <div className="description flex-wrap">
                  <i>{nftMeta.description}</i>
                </div>
                <div className="mt-2">
                  {nftItemCollection !== null && (
                    <div className="text-truncate">
                      <span>
                        <b>In</b>{" "}
                        <a
                          className="simple-link"
                          href={link(`/collection/${nftItemCollection.handle}`)}
                        >
                          {nftItemCollection.name}
                        </a>
                      </span>
                    </div>
                  )}
                  {profile !== undefined && profile !== null && (
                    <div className="text-truncate">
                      <span>
                        <b>By</b>{" "}
                        <a
                          className="simple-link"
                          href={link(`/profile/${profile.address}`)}
                        >
                          {profile.name || profile.address}
                        </a>
                      </span>
                    </div>
                  )}
                  {profile === null && (
                    <div className="text-truncate">
                      <span>
                        <b>By</b> -
                      </span>
                    </div>
                  )}
                  {nftOwner !== undefined && nftOwner !== null && (
                    <div className="text-truncate">
                      <span>
                        <b>Owner</b>{" "}
                        <a
                          className="simple-link"
                          href={link(`/profile/${nftOwner.address}`)}
                        >
                          {nftOwner.name || nftOwner.address}
                        </a>
                      </span>
                    </div>
                  )}
                  {nftOwner === undefined && (
                    <div className="text-truncate">
                      <span>
                        <b>Owner</b> -
                      </span>
                    </div>
                  )}
                  <div className="text-truncate">
                    <span>
                      <b>Original content</b>
                    </span>
                    &nbsp;
                    {downloadLink === null && (
                      <span className="me-auto clickable" onClick={doDownload}>
                        Verify ownership
                      </span>
                    )}
                    {downloadLink !== null && (
                      <a
                        className="simple-link me-auto"
                        href={downloadLink}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Link
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex-fill d-flex flex-column">
                  <div className="mx-auto my-auto py-4 text-center">
                    <span className="card-price">
                      {satoshiToLocaleString(nftState.stats.price)}
                    </span>
                    <br />
                    <span className="card-price-subtitle">DINGO</span>
                  </div>
                </div>
                {nftState !== null && (
                  <div className="mt-1">
                    <span className="text-muted">
                      <FontAwesomeIcon icon={faCashRegister} /> Trade volume{" "}
                    </span>
                    <span>
                      {satoshiToLocaleString(nftState.stats.tradeVolume)}
                    </span>
                    <br />
                    <span className="text-muted">
                      <FontAwesomeIcon icon={faExchangeAlt} /> Trade count{" "}
                    </span>
                    <span>{nftState.stats.tradeCount}</span>
                    <br />
                    <span className="text-muted">Last trade height </span>
                    <span>
                      {nftState.stats.tradeHeight === null
                        ? "-"
                        : toLocaleString(nftState.stats.tradeHeight)}
                    </span>
                    <br />
                    <span className="text-muted">List height </span>
                    <span>{toLocaleString(nftState.stats.listHeight)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {view === "nft" && nftMeta !== null && nftItemCollection !== undefined && (
        <div className="profile-section py-3">
          <div className="d-flex flex-row content-header">
            <span className="me-auto content-title accent">Buy this NFT</span>
          </div>
          <div>
            {nftBusy !== undefined && nftBusy !== null && (
              <div className="mt-4 text-center">
                {" "}
                <h5>NFT busy</h5>
                <p>
                  <a
                    className="simple-link"
                    href={
                      "https://openchains.info/coin/dingocoin/tx/" +
                      nftBusy.txid
                    }
                    rel="noreferrer"
                    target="_blank"
                  >
                    A transaction
                  </a>{" "}
                  is currenly being confirmed for this NFT. <br />
                  Please try again in a few minutes.
                </p>
              </div>
            )}
            {nftBusy !== undefined && nftBusy === null && buyResult === null && (
              <div className="d-flex flex-column">
                <div className="mt-4 text-center px-4">
                  <Form.Group>
                    <Form.Label>
                      <b>Resell at (*required)</b>
                    </Form.Label>
                    <Form.Control
                      type="text"
                      value={resellPrice}
                      onChange={(e) => {
                        if (e.target.value.match(/^[0-9]*$/)) {
                          setResellPrice(e.target.value);
                        }
                      }}
                      style={{ textAlign: "center" }}
                      isInvalid={resellPriceError !== ""}
                    />
                    {resellPriceError && (
                      <div>
                        <Form.Text className="input-error">
                          {resellPriceError}
                        </Form.Text>
                      </div>
                    )}
                    <Form.Text className="text-muted">
                      New price you want to sell this NFT for (min. 1
                      Dingocoin).
                    </Form.Text>
                  </Form.Group>
                </div>
                <div className="d-flex flex-row">
                  <Button
                    className="popup-button mt-4 mx-auto px-4"
                    style={{ width: "auto" }}
                    disabled={resellPriceError !== ""}
                    onClick={doBuy}
                  >
                    Buy and resell NFT
                  </Button>
                </div>
              </div>
            )}
            {buyResult !== null && buyResult.error === undefined && (
              <div className="mt-4 text-center">
                {" "}
                <h4>Transaction submitted!</h4>
                <p>
                  Transaction ID:{" "}
                  <a
                    className="simple-link"
                    href={
                      "https://openchains.info/coin/dingocoin/tx/" +
                      buyResult.txid
                    }
                    rel="noreferrer"
                    target="_blank"
                  >
                    {buyResult.txid}
                  </a>
                  <br />
                  It may take a few minutes for your transaction to be
                  confirmed.
                </p>
              </div>
            )}
            {buyResult !== null && buyResult.error !== undefined && (
              <div style={{ textAlign: "center" }} className="mt-4">
                {" "}
                <h4>Transaction failed!</h4>
                <p>
                  - Make sure that your wallet has no pending transaction.
                  <br />- You can't buy this NFT as its owner/creator.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {view === "nft" && nftMeta !== null && nftItemCollection !== undefined && (
        <div className="profile-section py-3">
          <div className="d-flex flex-row content-header">
            <span className="me-auto content-title accent">
              Reduce NFT price
            </span>
          </div>
          <div>
            {nftBusy !== undefined && nftBusy !== null && (
              <div className="mt-4 text-center">
                {" "}
                <h5>NFT busy</h5>
                <p>
                  <a
                    className="simple-link"
                    href={
                      "https://openchains.info/coin/dingocoin/tx/" +
                      nftBusy.txid
                    }
                    rel="noreferrer"
                    target="_blank"
                  >
                    A transaction
                  </a>{" "}
                  is currenly being confirmed for this NFT. <br />
                  Please try again in a few minutes.
                </p>
              </div>
            )}
            {nftBusy !== undefined &&
              nftBusy === null &&
              repriceResult === null && (
                <div className="d-flex flex-column">
                  <div className="mt-4 text-center px-4">
                    <Form.Group>
                      <Form.Label>
                        <b>Reduced price at (*required)</b>
                      </Form.Label>
                      <Form.Control
                        type="text"
                        value={repricePrice}
                        onChange={(e) => {
                          if (e.target.value.match(/^[0-9]*$/)) {
                            setRepricePrice(e.target.value);
                          }
                        }}
                        style={{ textAlign: "center" }}
                        isInvalid={repricePriceError !== ""}
                      />
                      {repricePriceError && (
                        <div>
                          <Form.Text className="input-error">
                            {repricePriceError}
                          </Form.Text>
                        </div>
                      )}
                      <Form.Text className="text-muted">
                        New reduced sell price for NFT (min. 1 Dingocoin).
                      </Form.Text>
                    </Form.Group>
                  </div>
                  <div className="d-flex flex-row">
                    <Button
                      className="popup-button mt-4 mx-auto px-4"
                      style={{ width: "auto" }}
                      disabled={repricePriceError !== ""}
                      onClick={doReprice}
                    >
                      Reduce NFT price
                    </Button>
                  </div>
                </div>
              )}
            {repriceResult !== null && repriceResult.error === undefined && (
              <div className="mt-4 text-center">
                {" "}
                <h4>Transaction submitted!</h4>
                <p>
                  Transaction ID:{" "}
                  <a
                    className="simple-link"
                    href={
                      "https://openchains.info/coin/dingocoin/tx/" +
                      repriceResult.txid
                    }
                    rel="noreferrer"
                    target="_blank"
                  >
                    {repriceResult.txid}
                  </a>
                  <br />
                  It may take a few minutes for your transaction to be
                  confirmed.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <GetWalletModal
        show={getWalletShow}
        onHide={() => setGetWalletShow(false)}
      />

      {(view === "profile" || view === "profileOwned") && (
        <EditProfileModal
          title="Edit profile"
          show={editProfileShow}
          onHide={() => setEditProfileShow(false)}
          address={profileAddress}
          onSubmit={doEditProfileSubmit}
        />
      )}

      {view === "profile" && (
        <CreateCollectionModal
          title="Create new collection"
          show={createCollectionShow}
          owner={profileAddress}
          onHide={() => setCreateCollectionShow(false)}
          onSubmit={doCreateCollectionSubmit}
        />
      )}

      {view === "collection" && collection !== null && (
        <EditCollectionModal
          title="Edit collection"
          show={editCollectionShow}
          handle={collection.handle}
          onHide={() => setEditCollectionShow(false)}
          onSubmit={doEditCollectionSubmit}
        />
      )}
    </div>
  );
}

export default ProfileController;
