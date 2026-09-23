import {
  div,
  Tab,
  Nav,
  Button,
  Dropdown,
  InputGroup,
  FormControl,
  Form,
  Spinner,
} from "react-bootstrap";
import React from "react";
import {
  queryNftByNewest,
  queryNft,
  queryNftBySearch,
} from "./api";
import { useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faList,
  faSearch,
  faArrowRight,
} from "@fortawesome/free-solid-svg-icons";
import NFTCard from "./NFTCard";
import { link } from "./utils";

function ExploreNftsController() {
  const location = useLocation();
  let view = location.pathname.split("/").pop();
  view = ["search"].includes(view) ? view : "all";

  // For explore view.
  const [nftList, setNftList] = React.useState(null);
  const [nftListEnd, setNftListEnd] = React.useState(false);
  const [queryText, setQueryText] = React.useState("Newly listed");
  const [search, setSearch] = React.useState("");
  const [searchEntries, setSearchEntries] = React.useState(undefined);

  const [viewMoreEnabled, setViewMoreEnabled] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      if (view === "all") {
        const l = (await queryNftByNewest({ beforeId: null })).results;
        if (l.length < 100) {
          setNftListEnd(true);
        }
        setNftList(l);
      } else if (view === "search") {
        const queryParam = new URLSearchParams(location.search).get("query");
        if (queryParam === null) {
          setSearch("");
          setSearchEntries(null);
        } else {
          setSearch(queryParam);
          setSearchEntries(
            (await queryNftBySearch({ search: queryParam })).results
          );
        }
      }
    })();
  }, []);

  const doSearch = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();

    if (search.trim() !== "") {
      window.location.assign(link(`/nfts/search?query=${search.trim()}`));
    }
  };

  const doChangeQuery = async (eventKey, event) => {
    const [key, direction] = eventKey.split("|");
    setQueryText(event.target.innerText);

    setNftListEnd(false);
    if (key === "listHeight") {
      const l = (await queryNftByNewest({ beforeId: null })).results;
      if (l.length < 100) {
        setNftListEnd(true);
      }
      setNftList(l);
      setViewMoreEnabled(true);
    } else {
      const l = await queryNft({
        key: key,
        direction: direction,
        limit: 100,
        offset: 0,
      });
      setNftList(
        l.results.map((x) => {
          return {
            address: x,
          };
        })
      );
      setViewMoreEnabled(false);
    }
  };

  const onViewMore = async () => {
    const l = (
      await queryNftByNewest({ beforeId: nftList[nftList.length - 1].id })
    ).results;
    if (l.length < 100) {
      setNftListEnd(true);
    }
    setNftList(nftList.concat(l));
  };

  return (
    <div className="d-flex flex-column">
      <div
        className="mx-auto mt-4 accent text-center d-flex flex-column"
        style={{ maxWidth: "584px", width: "100%" }}
      >
        <h1>Explore Nfts</h1>
      </div>
      {["all", "search"].includes(view) && (
        <Tab.Container id="left-tabs-example" defaultActiveKey="first">
          <div>
            <Nav variant="tabs" className="custom-nav-tabs mt-4 constant-width">
              <Nav.Item className="ms-auto text-center">
                <Nav.Link href={link("/nfts")} active={view === "all"}>
                  <FontAwesomeIcon icon={faList} className="me-2" />
                  All NFTs
                </Nav.Link>
              </Nav.Item>
              <Nav.Item className="me-auto text-center">
                <Nav.Link href={link("/nfts/search")} active={view === "search"}>
                  <FontAwesomeIcon icon={faSearch} className="me-2" />
                  Search
                </Nav.Link>
              </Nav.Item>
            </Nav>
            <hr className="light-border" />
          </div>
          <div>
            {view === "all" && (
              <Tab.Content>
                <Dropdown
                  onSelect={doChangeQuery}
                  style={{ textAlign: "center" }}
                >
                  <Dropdown.Toggle className="px-4 mt-4">
                    {queryText}
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Item eventKey="listHeight|DESC">
                      Newly listed
                    </Dropdown.Item>
                    <Dropdown.Item eventKey="tradeHeight|DESC">
                      Recently sold
                    </Dropdown.Item>
                    <Dropdown.Item eventKey="price|DESC">
                      Highest price
                    </Dropdown.Item>
                    <Dropdown.Item eventKey="price|ASC">
                      Lowest price
                    </Dropdown.Item>
                    <Dropdown.Item eventKey="tradeCount|DESC">
                      Highest trade count
                    </Dropdown.Item>
                    <Dropdown.Item eventKey="tradeCount|ASC">
                      Lowest trade count
                    </Dropdown.Item>
                    <Dropdown.Item eventKey="tradeVolume|DESC">
                      Highest trade volume
                    </Dropdown.Item>
                    <Dropdown.Item eventKey="tradeVolume|ASC">
                      Lowest trade volume
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
                <ul className="cards-container mt-4">
                  {nftList !== null &&
                    nftList.map((x) => (
                      <a key={x.address} href={link(`/nft/${x.address}`)}>
                        <NFTCard address={x.address} />
                      </a>
                    ))}
                  {viewMoreEnabled && nftList !== null && !nftListEnd && (
                    <Button onClick={onViewMore}>View more</Button>
                  )}
                </ul>
              </Tab.Content>
            )}
            {["search"].includes(view) && (
              <Tab.Content>
                <div className="d-flex flex-column">
                  <Form
                    style={{ maxWidth: "584px", width: "100%" }}
                    onSubmit={doSearch}
                    className="mx-auto"
                  >
                    <InputGroup className="mt-4">
                      <InputGroup.Text id="basic-addon1">
                        <FontAwesomeIcon icon={faSearch} />
                      </InputGroup.Text>
                      {search !== null && (
                        <FormControl
                          autoFocus="true"
                          className="search-box"
                          placeholder={"Search in NFTs..."}
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
                  <ul className="cards-container mt-4">
                    {searchEntries === null && (
                      <div className="d-flex flex-row">
                        <p className="mx-auto text-muted" animation="border">
                          Search in NFTs using the search box above
                        </p>
                      </div>
                    )}
                    {searchEntries === undefined && (
                      <div className="d-flex flex-row">
                        <Spinner className="mx-auto" animation="border" />
                      </div>
                    )}
                    {searchEntries !== undefined &&
                      searchEntries !== null &&
                      searchEntries.map((x) => (
                        <a key={x.address} href={link(`/nft/${x}`)}>
                          <NFTCard address={x} />
                        </a>
                      ))}
                    {searchEntries !== undefined &&
                      searchEntries !== null &&
                      searchEntries.length === 0 && (
                        <div className="d-flex flex-row">
                          <p className="mx-auto text-muted" animation="border">
                            No matching NFT
                          </p>
                        </div>
                      )}
                  </ul>
                </div>
              </Tab.Content>
            )}
          </div>
        </Tab.Container>
      )}
    </div>
  );
}

export default ExploreNftsController;
