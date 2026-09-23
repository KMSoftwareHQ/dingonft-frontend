import {
  Container,
  Row,
  Button,
  Col,
  Form,
  Spinner,
  ProgressBar,
} from "react-bootstrap";
import React from "react";
import CustomDivider from "./CustomDivider";
import isPng from "is-png";
import sizeOf from "buffer-image-size";
import Sha256 from "crypto-js/sha256";
import Hex from "crypto-js/enc-hex";
import Base64 from "crypto-js/enc-base64";
import GetWalletModal from "./GetWalletModal";
import { sendListTransaction, getListTransaction } from "./api";
import { toSatoshi, link } from "./utils";

const isWebp = (buffer) => {
  if (!buffer || buffer.length < 12) {
    return false;
  }

  return (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  );
};

const MAX_CONTENT_SIZE = 10 * 1e6; // 10 MB.
const MAX_PREVIEW_SIZE = 1 * 1e6; // 1 MB.

const toBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = (error) => reject(error);
  });

function CreateController() {
  const [content, setContent] = React.useState(null);
  const [contentError, setContentError] = React.useState("");
  const [listingPrice, setListingPrice] = React.useState("1000");
  const [royalty, setRoyalty] = React.useState(0);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [preview, setPreview] = React.useState(null);
  const [previewError, setPreviewError] = React.useState("");
  const [tags, setTags] = React.useState("");

  const [pending, setPending] = React.useState(false);
  const [success, setSuccess] = React.useState(null);
  const [error, setError] = React.useState("");
  const [address, setAddress] = React.useState(null);
  const [progress, setProgress] = React.useState(null);

  const [getWalletShow, setGetWalletShow] = React.useState(false);

  React.useEffect(() => {
    if (content === null) {
      setContentError("NFT content required");
      return;
    } else if (content.size > MAX_CONTENT_SIZE) {
      setContentError("NFT content size limit exceeded (max 10 MB)");
      return;
    } else {
      setContentError("");
    }
  }, [content]);

  React.useEffect(() => {
    (async () => {
      if (preview !== null) {
        const f = Buffer.from(await toBase64(preview), "base64");
        if (!isPng(f) && !isWebp(f)) {
          setPreviewError("Cover thumbnail must be a PNG or WEBP");
        } else if (preview.size > MAX_PREVIEW_SIZE) {
          setPreviewError("Cover file size limit exceeded (max 1 MB)");
        } else if (
          sizeOf(f).width === 0 ||
          sizeOf(f).width !== sizeOf(f).height
        ) {
          setPreviewError("Cover thumbnail must have equal width and height");
        } else {
          setPreviewError("");
        }
      } else {
        setPreviewError("Cover thumbnail required");
      }
    })();
  }, [preview]);

  const doSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();

    if (window.dingo === undefined) {
      setGetWalletShow(true);
      return;
    }

    const getListTransactionResponse = await getListTransaction({
      // CryptoJS expects inputs to be a utf8 string. So we encode our data
      // into that.
      contentHash: Hex.stringify(Sha256(Base64.parse(await toBase64(content)))),
      price: toSatoshi(listingPrice),
      royalty: 25 + Math.floor((royalty * 75) / 100),
    });
    if (
      getListTransactionResponse === null ||
      "error" in getListTransactionResponse
    ) {
      return;
    }

    const signed = (
      await window.dingo.requestSignTransaction(
        [],
        getListTransactionResponse.vouts
      )
    ).result;

    if (signed === null || signed === undefined) {
      return;
    }

    setPending(true);
    const sendListTransactionResponse = await sendListTransaction(
      {
        content: await toBase64(content),
        preview: preview === null ? null : await toBase64(preview),
        name: name,
        description: description,
        tags: tags,
        transaction: signed,
      },
      (e) => {
        if (e.lengthComputable) {
          setProgress((100 * parseFloat(e.loaded)) / parseFloat(e.total));
        } else {
          setProgress(null);
        }
      }
    );
    if (
      sendListTransactionResponse === null ||
      sendListTransactionResponse.error !== undefined
    ) {
      setSuccess(false);
      setError(sendListTransactionResponse.error);
      return;
    }

    setPending(false);
    setProgress(null);
    setSuccess(true);
    setError("");
    setAddress(sendListTransactionResponse.address);
  };

  return (
    <div>
      <Container className="App-header">
        <Row>
          <h1 className="mt-4">Create NFT</h1>
          <CustomDivider />
        </Row>
      </Container>
      <Container style={{ maxWidth: "900px" }}>
        <Row>
          <Col>
            {(success === null || success === false) && (
              <Form onSubmit={doSubmit}>
                <Form.Group className="mb-3 mt-4">
                  <Form.Label>
                    <b>Original content (*required)</b>
                  </Form.Label>
                  <Form.Control
                    type="file"
                    onChange={(e) => setContent(e.target.files[0])}
                    isInvalid={contentError !== null && contentError !== ""}
                    isValid={contentError === ""}
                  />
                  {contentError && (
                    <div>
                      <Form.Text className="input-error">
                        {contentError}
                      </Form.Text>
                    </div>
                  )}
                  <Form.Text className="text-muted">
                    Attach your original work in all it's glory. The NFT will be
                    locked uniquely to this file (
                    <span className="text-dark">
                      <b>max 10 MB</b>
                    </span>
                    ).
                    <br />
                    You can only use this file once. Only the current owner of
                    the NFT can download this file.
                  </Form.Text>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>
                    <b>Cover thumbnail (*required)</b>
                  </Form.Label>
                  <Form.Control
                    type="file"
                    onChange={(e) => setPreview(e.target.files[0])}
                    isInvalid={previewError !== null && previewError !== ""}
                    isValid={previewError === ""}
                  />
                  {previewError && (
                    <div>
                      <Form.Text className="input-error">
                        {previewError}
                      </Form.Text>
                    </div>
                  )}
                  <Form.Text className="text-muted">
                    Attach a thumbnail sized version for public display (
                    <span className="text-dark">
                      <b>square-sized PNG or WEBP; max 1 MB</b>
                    </span>
                    ).
                    <br />
                    You can't change this after creating the NFT.
                  </Form.Text>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>NFT Name (optional)</Form.Label>
                  <Form.Control
                    type="text"
                    value={name}
                    placeholder="Max 40 characters"
                    onChange={(e) => setName(e.target.value)}
                    isValid={name !== "" && name.length <= 40}
                    isInvalid={name !== "" && name.length > 40}
                  />
                  {name.length > 40 && (
                    <div>
                      <Form.Text className="input-error">
                        Name too long
                      </Form.Text>
                    </div>
                  )}
                  <Form.Text className="text-muted">
                    You can't change this after creating the NFT.
                  </Form.Text>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>NFT Description (optional)</Form.Label>
                  <Form.Control
                    type="text"
                    value={description}
                    placeholder="Max 500 characters"
                    onChange={(e) => setDescription(e.target.value)}
                    isValid={description !== "" && description.length <= 500}
                    isInvalid={description !== "" && description.length > 500}
                  />
                  {description.length > 500 && (
                    <div>
                      <Form.Text className="input-error">
                        Description long
                      </Form.Text>
                    </div>
                  )}
                  <Form.Text className="text-muted">
                    You can't change this after creating the NFT.
                  </Form.Text>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>NFT Tags (optional)</Form.Label>
                  <Form.Control
                    type="text"
                    value={tags}
                    placeholder="Max 100 characters; space separated"
                    onChange={(e) => setTags(e.target.value)}
                    isValid={tags !== "" && tags.length <= 100}
                    isInvalid={tags !== "" && tags.length > 100}
                  />
                  {tags.length > 100 && (
                    <div>
                      <Form.Text className="input-error">Tags long</Form.Text>
                    </div>
                  )}
                  <Form.Text className="text-muted">
                    You can't change this after creating the NFT.
                  </Form.Text>
                </Form.Group>

                <Form.Group className="mb-3 mt-2">
                  <Form.Label>
                    <b>Listing price (*required)</b>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    value={listingPrice}
                    onChange={(e) => {
                      if (
                        e.target.value.match(/^[0-9]+$/) &&
                        parseInt(e.target.value) >= 1
                      ) {
                        setListingPrice(e.target.value);
                      } else {
                        setListingPrice("1000");
                      }
                    }}
                  />
                  <Form.Text className="text-muted">
                    Initial selling price for your NFT in DINGO (min. 1 DINGO).
                  </Form.Text>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>
                    <b>Creator royalty (*required): </b>
                    {(2.5 + Math.floor((royalty * 75) / 100) / 10).toFixed(1) +
                      "%"}
                  </Form.Label>
                  <Form.Range
                    value={royalty}
                    onChange={(e) => setRoyalty(e.target.value)}
                  />
                  <Form.Text className="text-muted">
                    Royalty paid to you for every transaction of this NFT.
                  </Form.Text>
                </Form.Group>

                <div style={{ textAlign: "center" }}>
                  {success === null && pending === false && (
                    <Button
                      className="popup-button mt-4 px-4 mb-5"
                      variant="primary"
                      type="submit"
                      disabled={
                        content === null ||
                        contentError !== "" ||
                        (preview !== null && previewError !== "")
                      }
                    >
                      Create NFT
                    </Button>
                  )}
                  {success === null && pending === true && (
                    <div>
                      {progress === null && <Spinner animation="border" />}
                      {progress !== null && (
                        <ProgressBar
                          striped
                          animated
                          now={progress}
                          label={`${progress.toFixed(1)}%`}
                        />
                      )}
                      <p>
                        Transaction pending...
                        <br />
                        (DO NOT CLOSE THIS PAGE)
                      </p>
                    </div>
                  )}
                  {success === false && (
                    <div>
                      <p>
                        Transaction failed!
                        <br />
                        Error: <b>{error}</b>
                        <br />
                        Please reload this page and try again
                      </p>
                    </div>
                  )}
                </div>
              </Form>
            )}
            {success === true && (
              <div style={{ textAlign: "center" }}>
                {" "}
                <h3>NFT Created!</h3>
                <p>
                  NFT Address: <b>{address}</b>
                </p>
                <div style={{ textAlign: "center" }}>
                  <a href={link("/nft/" + address)}>
                    <Button className="popup-button px-4" variant="primary">
                      View NFT ►
                    </Button>
                  </a>
                </div>
              </div>
            )}
          </Col>
        </Row>
      </Container>

      <GetWalletModal
        show={getWalletShow}
        onHide={() => setGetWalletShow(false)}
      />
    </div>
  );
}

export default CreateController;
