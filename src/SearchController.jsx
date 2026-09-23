import {
  Tab,
  Nav,
  Button,
  InputGroup,
  FormControl,
  Form,
  Spinner,
} from "react-bootstrap";
import React from "react";
import {
  queryNftBySearch,
  queryCollectionBySearch,
  queryProfileBySearch,
} from "./api";
import { useLocation } from "react-router-dom";
import CollectionCard from "./CollectionCard";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBolt,
  faList,
  faSearch,
  faArrowRight,
  faUserCircle,
} from "@fortawesome/free-solid-svg-icons";
import NFTCard from "./NFTCard";
import ProfileCard from "./ProfileCard";
import { link } from "./utils";

function SearchController() {
  const location = useLocation();

  // For search view.
  const [search, setSearch] = React.useState("");
  const [searchSubView, setSearchSubView] = React.useState(null);
  const [searchNfts, setSearchNfts] = React.useState(null);
  const [searchCollections, setSearchCollections] = React.useState(null);
  const [searchProfiles, setSearchProfiles] = React.useState(null);

  React.useEffect(() => {
    (async () => {
      setSearch(new URLSearchParams(location.search).get("query"));
      await doChangeSearchSubview("nfts");
    })();
  }, []);

  const doSearch = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();

    if (search.trim() !== "") {
      window.location.assign(link(`/search?query=${search.trim()}`));
    }
  };

  const doChangeSearchSubview = async (subview) => {
    // TODO: Figure out a more elegant way to retrieve this from the existing react state.
    const search = new URLSearchParams(location.search).get("query");

    setSearchSubView(subview);

    if (subview === "nfts" && searchNfts === null) {
      setSearchNfts((await queryNftBySearch({ search: search })).results);
    }
    if (subview === "collections" && searchCollections === null) {
      setSearchCollections(
        (await queryCollectionBySearch({ search: search })).results
      );
    }
    if (subview === "profiles" && searchProfiles === null) {
      setSearchProfiles(
        (await queryProfileBySearch({ search: search })).results
      );
    }
  };

  return (
    <div className="d-flex flex-column">
      <div
        className="mx-auto mt-4 accent text-center d-flex flex-column"
        style={{ maxWidth: "584px", width: "100%" }}
      >
        <h1>Search 🔍</h1>
        <Form onSubmit={doSearch}>
          <InputGroup className="mt-4">
            <InputGroup.Text id="basic-addon1">
              <FontAwesomeIcon icon={faSearch} />
            </InputGroup.Text>
            {search !== null && (
              <FormControl
                className="search-box"
                placeholder={"Search NFTs, collections, profiles..."}
                value={search}
                onChange={(e) => {
                  if (e.target.value.length <= 50) {
                    setSearch(e.target.value);
                  }
                }}
              />
            )}
            {search !== "" && (
              <Button variant="primary" type="submit">
                <FontAwesomeIcon icon={faArrowRight} />
              </Button>
            )}
          </InputGroup>
        </Form>
      </div>
      <Tab.Container
        id="left-tabs-example"
        activeKey={searchSubView}
        onSelect={doChangeSearchSubview}
      >
        <div>
          <Nav variant="tabs" className="custom-nav-tabs mt-4 constant-width">
            <Nav.Item className="ms-auto text-center">
              <Nav.Link eventKey="nfts">
                <FontAwesomeIcon icon={faList} className="me-2" />
                NFTs
              </Nav.Link>
            </Nav.Item>
            <Nav.Item className="text-center">
              <Nav.Link eventKey="collections">
                <FontAwesomeIcon icon={faBolt} className="me-2" />
                Collections
              </Nav.Link>
            </Nav.Item>
            <Nav.Item className="me-auto text-center">
              <Nav.Link eventKey="profiles">
                <FontAwesomeIcon icon={faUserCircle} className="me-2" />
                Profiles
              </Nav.Link>
            </Nav.Item>
          </Nav>
          <hr className="light-border" />
        </div>
        <div>
          <Tab.Content>
            <Tab.Pane eventKey="nfts">
              <ul className="cards-container mt-4">
                {searchNfts === null && (
                  <div className="d-flex flex-row">
                    <Spinner className="mx-auto" animation="border" />
                  </div>
                )}
                {searchNfts !== null &&
                  searchNfts.map((x) => (
                    <a key={x.address} href={link(`/nft/${x}`)}>
                      <NFTCard address={x} />
                    </a>
                  ))}
                {searchNfts !== null && searchNfts.length === 0 && (
                  <div className="d-flex flex-row">
                    <p className="mx-auto text-muted" animation="border">
                      No matching NFTs
                    </p>
                  </div>
                )}
              </ul>
            </Tab.Pane>
            <Tab.Pane eventKey="collections">
              <ul className="collection-cards-container mt-4">
                {searchCollections === null && (
                  <div className="d-flex flex-row">
                    <Spinner className="mx-auto" animation="border" />
                  </div>
                )}
                {searchCollections !== null &&
                  searchCollections.map((x) => (
                    <a key={x} href={link(`/collection/${x}`)}>
                      <CollectionCard handle={x} />
                    </a>
                  ))}
                {searchCollections !== null && searchCollections.length === 0 && (
                  <div className="d-flex flex-row">
                    <p className="mx-auto text-muted" animation="border">
                      No matching collection
                    </p>
                  </div>
                )}
              </ul>
            </Tab.Pane>
            <Tab.Pane eventKey="profiles">
              <ul className="profile-cards-container mt-4">
                {searchProfiles === null && (
                  <div className="d-flex flex-row">
                    <Spinner className="mx-auto" animation="border" />
                  </div>
                )}
                {searchProfiles !== null &&
                  searchProfiles.map((x) => (
                    <a key={x} href={link(`/profile/${x}`)}>
                      <ProfileCard address={x} />
                    </a>
                  ))}
                {searchProfiles !== null && searchProfiles.length === 0 && (
                  <div className="d-flex flex-row">
                    <p className="mx-auto text-muted" animation="border">
                      No matching profile
                    </p>
                  </div>
                )}
              </ul>
            </Tab.Pane>
          </Tab.Content>
        </div>
      </Tab.Container>
    </div>
  );
}

export default SearchController;
