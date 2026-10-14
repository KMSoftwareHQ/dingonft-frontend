import "./App.scss";
import MaintLogo from "./assets/img/Comp-1_1.gif";

// Controls.
import { Navbar, Container, Row } from "react-bootstrap";

// Assets.
import DingocoinLogo from "./assets/img/dingocoin.png";

// Output.
export default function Maintenance() {
  return (
    <div className="App">
      <Navbar className="navbar" align="text-center" bg="dark" expand="lg" sticky="top">
        <Container>
          <Navbar.Brand href="#home" className="navbar-brand">
            <img alt="" src={DingocoinLogo} />
            <span>DINGOCOIN</span>
          </Navbar.Brand> 
        </Container>
      </Navbar>
    <section className="projects min-height-fill" >
      <Container className="py-3 py-lg-5 d-flex flex-column mt-4">
	  <Row>
   			<h3 className="mt-4 text-center">We're Sorry.....</h3>
            <span className="subtitle mx-auto text-start text-lg-center">
              We Are Down For Scheduled Maintenance. Please Check Back Later. <br /> <br />
        
      	 <img alt="" src={MaintLogo} />  
      </span>
      </Row>
      </Container>
      </section>
      <br />
      <br />
      <section className="section-footer text-center">
          <Container>
            <Row>
              <span>
                <b>© The Dingocoin Project 2021 - 2022<br /></b>
              </span>
            </Row>  
          </Container>
        </section>
    </div>
   );
 }
