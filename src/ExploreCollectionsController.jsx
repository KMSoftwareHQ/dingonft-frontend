import {
  div,
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
  queryCollectionByTradeCountScaled,
  queryCollectionByTradeVolume,
  queryCollectionBySearch,
} from "./api";
import { useLocation } from "react-router-dom";
import CollectionCard from "./CollectionCard";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBolt,
  faFire,
  faSearch,
  faArrowRight,
} from "@fortawesome/free-solid-svg-icons";
import { link } from "./utils";

function ExploreCollectionsController() {
  const location = useLocation();
  let view = location.pathname.split("/").pop();
  view = ["top", "search"].includes(view) ? view : "hot";

  // For explore view.
  const [collectionList, setCollectionList] = React.useState(null);
  const [search, setSearch] = React.useState("");
  const [searchEntries, setSearchEntries] = React.useState(undefined);

  React.useEffect(() => {
    (async () => {
      if (view === "hot") {
        const l = await queryCollectionByTradeCountScaled(9999);
        setCollectionList(l.results);
      } else if (view === "top") {
        const l = await queryCollectionByTradeVolume();
        setCollectionList(l.results);
      } else if (view === "search") {
        const queryParam = new URLSearchParams(location.search).get("query");
        if (queryParam === null) {
          setSearch("");
          setSearchEntries(null);
        } else {
          setSearch(queryParam);
          setSearchEntries(
            (await queryCollectionBySearch({ search: queryParam })).results
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
      window.location.assign(link(`/collections/search?query=${search.trim()}`));
    }
  };

  return (
    <div className="d-flex flex-column">
      <div
        className="mx-auto mt-4 accent text-center d-flex flex-column"
        style={{ maxWidth: "584px", width: "100%" }}
      >
        <h1>Explore Collections</h1>
      </div>
      {["hot", "top", "search"].includes(view) && (
        <Tab.Container id="left-tabs-example" defaultActiveKey="first">
          <div>
            <Nav variant="tabs" className="custom-nav-tabs mt-4 constant-width">
              <Nav.Item className="ms-auto text-center">
                <Nav.Link href={link("/collections/")} active={view === "hot"}>
                  <FontAwesomeIcon icon={faBolt} className="me-2" />
                  Trending
                </Nav.Link>
              </Nav.Item>
              <Nav.Item className="text-center">
                <Nav.Link href={link("/collections/top")} active={view === "top"}>
                  <FontAwesomeIcon icon={faFire} className="me-2" />
                  Top
                </Nav.Link>
              </Nav.Item>
              <Nav.Item className="me-auto text-center">
                <Nav.Link href={link("/collections/search")} active={view === "search"}>
                  <FontAwesomeIcon icon={faSearch} className="me-2" />
                  Search
                </Nav.Link>
              </Nav.Item>
            </Nav>
            <hr className="light-border" />
          </div>
          <div>
            {["hot", "top"].includes(view) && collectionList !== null && (
              <Tab.Content>
                <ul className="collection-cards-container mt-4">
                  {collectionList.map((x) => (
                    <a key={x} href={link(`/collection/${x}`)}>
                      <CollectionCard handle={x} />
                    </a>
                  ))}
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
                          className="search-box"
                          placeholder={"Search in collections..."}
                          value={search}
                          autoFocus="true"
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
                  <ul className="collection-cards-container mt-4">
                    {searchEntries === null && (
                      <div className="d-flex flex-row">
                        <p className="mx-auto text-muted" animation="border">
                          Search in collections using the search box above
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
                        <a key={x} href={link(`/collection/${x}`)}>
                          <CollectionCard handle={x} />
                        </a>
                      ))}
                    {searchEntries !== undefined &&
                      searchEntries !== null &&
                      searchEntries.length === 0 && (
                        <div className="d-flex flex-row">
                          <p className="mx-auto text-muted" animation="border">
                            No matching collection
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

export default ExploreCollectionsController;
