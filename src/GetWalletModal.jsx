import { Modal, Container, Button } from "react-bootstrap";

function GetWalletModal(props) {
  return (
    <Modal
      size="md"
      centered
      show={props.show}
      onHide={props.onHide}
    >
      <Modal.Header closeButton>
        <Modal.Title>
          Browser Wallet required
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Container className="text-center my-2">
          <p>You need a Dingocoin browser wallet for this.<br/>Set it up in less than a minute.</p>
          <a className="my-1" href="https://dingocoin.com/wallets" target="_blank" rel="noreferrer">
            <Button className="mx-2">Get Chrome wallet</Button>
          </a>
          <a className="my-1" href="https://dingocoin.com/wallets" target="_blank" rel="noreferrer">
            <Button className="mx-2">Get Firefox wallet</Button>
          </a>
        </Container>
      </Modal.Body>
    </Modal>
  );
}

export default GetWalletModal;
