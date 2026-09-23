import {
  Row,
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
  queryProfileBySearch,
  queryProfileByTradeCount,
  queryProfileByEarnings,
} from "./api";
import { useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSearch,
  faArrowRight,
  faBullseye,
  faCoins,
} from "@fortawesome/free-solid-svg-icons";
import ProfileCard from "./ProfileCard";
import { link } from "./utils";

function ExploreProfilesController() {
  const location = useLocation();
  let view = location.pathname.split("/").pop();
  view = ["earnings", "search"].includes(view) ? view : "influence";

  // For explore view.
  const [profileList, setProfileList] = React.useState(null);
  const [search, setSearch] = React.useState("");
  const [searchEntries, setSearchEntries] = React.useState(undefined);

  React.useEffect(() => {
    (async () => {
      if (view === "influence") {
        const l = await queryProfileByTradeCount();
        setProfileList(l.results);
      } else if (view === "earnings") {
        const l = await queryProfileByEarnings();
        setProfileList(l.results);
      } else if (view === "search") {
        const queryParam = new URLSearchParams(location.search).get("query");
        if (queryParam === null) {
          setSearch("");
          setSearchEntries(null);
        } else {
          setSearch(queryParam);
          setSearchEntries(
            (await queryProfileBySearch({ search: queryParam })).results
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
      window.location.assign(link(`/profiles/search?query=${search.trim()}`));
    }
  };

  return (
    <div className="d-flex flex-column">
      <div
        className="mx-auto mt-4 accent text-center d-flex flex-column"
        style={{ maxWidth: "584px", width: "100%" }}
      >
        <h1>Explore Profiles</h1>
      </div>
      {["influence", "earnings", "search"].includes(view) && (
        <Tab.Container id="left-tabs-example" defaultActiveKey="first">
          <div>
            <Nav variant="tabs" className="custom-nav-tabs mt-4">
              <Nav.Item className="ms-auto text-center">
                <Nav.Link href={link("/profiles")} active={view === "influence"}>
                  <FontAwesomeIcon icon={faBullseye} className="me-2" />
                  Influence
                </Nav.Link>
              </Nav.Item>
              <Nav.Item className="text-center">
                <Nav.Link
                  href={link("/profiles/earnings")}
                  active={view === "earnings"}
                >
                  <FontAwesomeIcon icon={faCoins} className="me-2" />
                  Earnings
                </Nav.Link>
              </Nav.Item>
              <Nav.Item className="me-auto text-center">
                <Nav.Link href={link("/profiles/search")} active={view === "search"}>
                  <FontAwesomeIcon icon={faSearch} className="me-2" />
                  Search
                </Nav.Link>
              </Nav.Item>
            </Nav>
            <hr className="light-border" />
          </div>
          <div>
            {["influence", "earnings"].includes(view) && profileList !== null && (
              <Tab.Content>
                <ul className="profile-cards-container mt-4">
                  {profileList !== null &&
                    profileList.map((x) => (
                      <a key={x} href={link(`/profile/${x}`)}>
                        <ProfileCard address={x} />
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
                          placeholder={"Search in profiles..."}
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
                  <ul className="profile-cards-container mt-4">
                    {searchEntries === null && (
                      <div className="d-flex flex-row">
                        <p className="mx-auto text-muted" animation="border">
                          Search in profiles using the search box above
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
                        <a key={x} href={link(`/profile/${x}`)}>
                          <ProfileCard address={x} />
                        </a>
                      ))}
                    {searchEntries !== undefined &&
                      searchEntries !== null &&
                      searchEntries.length === 0 && (
                        <div className="d-flex flex-row">
                          <p className="mx-auto text-muted" animation="border">
                            No matching profile
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

export default ExploreProfilesController;
