import "./App.scss";
import CreateController from "./CreateController";
import ProfileController from "./ProfileController";
import ExploreCollectionsController from "./ExploreCollectionsController";
import ExploreNftsController from "./ExploreNftsController";
import ExploreProfilesController from "./ExploreProfilesController";
import SearchController from "./SearchController";
import {
  Navbar,
  Nav,
  NavDropdown,
  NavItem,
  NavLink,
  Dropdown,
  Container,
  Form,
  FormControl,
  Button,
  Modal,
  InputGroup,
} from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faAngleRight,
  faList,
  faUserCircle,
  faThLarge,
  faShoppingBag,
} from "@fortawesome/free-solid-svg-icons";
import DingocoinLogo from "./assets/img/dingocoin.png";
import MaintLogo from "./assets/img/Comp-1_1.gif";

import React from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import Main from "./Main";
import Maintenance from "./Maintenance"
import { link } from "./utils";
export default function App() {

  const [location, setLocation] = React.useState(null);
  React.useEffect(() => {
    setLocation(window.location.pathname);
  }, []);
  React.useEffect(() => {}, [location]);

  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchErrorShow, setSearchErrorShow] = React.useState(null);

  const doSearch = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();

    if (searchQuery.trim() !== "") {
      window.location.assign(link(`/search?query=${searchQuery.trim()}`));
    }
  };
{/*Toggle Maint Mode  const maintenance=   | true = Maint Mode on  |  false = Maint Mode Off*/}
  const maintenance = false;  {/*<--- Toggle ON/OFF Here*/}
  return (
    <>
      {maintenance ? (
        <Maintenance />
      ) : (

    <div className="App">
      <Navbar className="navbar px-4 py-2" bg="dark" expand="lg" sticky="top">
        <Navbar.Brand href={link("/")} className="navbar-brand align-items-center">
          <img alt="" src={DingocoinLogo} />
          <span className="d-none d-lg-block d-xl-block">DINGOCOIN</span>
          <span className="navbar-brand-subtitle"> NFT Platform</span>
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse>
          <Nav className="ms-auto text-center">
            <Form className="d-flex" onSubmit={doSearch}>
              <InputGroup
                style={{
                  minWidth: "20rem",
                }}
              >
                <FormControl
                  className="search-box my-1"
                  placeholder={"Search NFTs, collections, profiles..."}
                  value={searchQuery}
                  onChange={(e) => {
                    if (e.target.value.length <= 50) {
                      setSearchQuery(e.target.value);
                    }
                  }}
                />
                {searchQuery !== "" && (
                  <Button variant="secondary" type="submit">
                    <FontAwesomeIcon icon={faAngleRight}></FontAwesomeIcon>
                  </Button>
                )}
              </InputGroup>
            </Form>
            <Nav.Link href={link("/")}>
              <span className="align-middle">
                <nobr>Home</nobr>
              </span>
            </Nav.Link>
            <Dropdown as={NavItem} className="navbar-important">
              <Dropdown.Toggle as={NavLink}>
                <span className="align-middle">Explore</span>
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item href={link("/collections")}>
                  <FontAwesomeIcon className="me-2 accent" icon={faThLarge} />
                  Collections
                </Dropdown.Item>
                <Dropdown.Item href={link("/nfts")}>
                  <FontAwesomeIcon className="me-2 accent" icon={faList} />
                  NFTs
                </Dropdown.Item>
                <Dropdown.Item href={link("/profiles")}>
                  <FontAwesomeIcon
                    className="me-2 accent"
                    icon={faUserCircle}
                  />
                  Profiles
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
            <Nav.Link href={link("/create")}>
              <span className="align-middle">
                <nobr>Create</nobr>
              </span>
            </Nav.Link>
            <Nav.Link href="https://forms.gle/jxhWR7EMWV7fivn46" target="_blank" rel="noreffere">
              <span className="align-middle">
                <nobr>Report</nobr>
              </span>
            </Nav.Link>
            <Nav.Link href="https://dingocoin.org" target="_blank">
              <span className="align-middle">
                <nobr>Visit Dingocoin</nobr>
              </span>
            </Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Navbar>
      <section className="section-content">
        <Router basename={process.env.PUBLIC_URL}>
          <Routes>
            <Route index element={<Main />} />
            <Route path="/profile">
              <Route path=":profileAddress" element={<ProfileController />}>
                <Route path="owned" element={<ProfileController />} />
                <Route path="stats" element={<ProfileController />} />
              </Route>
            </Route>
            <Route
              path="/collection/:collectionHandle"
              element={<ProfileController />}
            />
            <Route path="/nft/:nftAddress" element={<ProfileController />} />
            <Route
              path="/collections"
              element={<ExploreCollectionsController />}
            >
              <Route path="hot" element={<ExploreCollectionsController />} />
              <Route path="top" element={<ExploreCollectionsController />} />
              <Route path="search" element={<ExploreCollectionsController />} />
            </Route>
            <Route path="/nfts" element={<ExploreNftsController />}>
              <Route path="search" element={<ExploreNftsController />} />
            </Route>
            <Route path="/profiles" element={<ExploreProfilesController />}>
              <Route path="earnings" element={<ExploreProfilesController />} />
              <Route path="search" element={<ExploreProfilesController />} />
            </Route>
            <Route path="/search" element={<SearchController />} />
            <Route path="/create" element={<CreateController />} />
            <Route element={<Navigate to="/" />} />
          </Routes>
        </Router>
      </section>
      <section>
        <div className="justify-content-center section-footer align-items-center">
          <h6>Copyright © The Dingocoin Project 2021-2022</h6>
        </div>
      </section>

      <Modal
        size="md"
        centered
        show={searchErrorShow}
        onHide={() => setSearchErrorShow(false)}
      >
        <Modal.Header closeButton>
          <Modal.Title>NFT/profile not found</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Container className="text-center my-2">
            <p>No results found.</p>
            <Button className="mx-2" onClick={() => setSearchErrorShow(false)}>
              Close
            </Button>
          </Container>
        </Modal.Body>
      </Modal>
    </div>
     )}
    </>
  );
}
