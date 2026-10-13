import { Modal, Button, Form } from "react-bootstrap";
import React from "react";
import { getProfileCreatedNfts } from "./api";
import { getMeta, getCollection } from "./storage";

function EditCollectionModal(props) {
  const [createdNfts, setCreatedNfts] = React.useState(null);
  const [thumbnailIndex, setThumbnailIndex] = React.useState(null);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");

  React.useEffect(() => {
    (async () => {
      if (props.handle !== undefined && props.handle !== null) {
        const collection = await getCollection(props.handle);
        setName(collection.name);
        setDescription(collection.description);

        const createdNfts = (await getProfileCreatedNfts({ owner: collection.owner })).results.reverse();
        if (createdNfts.length > 0) {
          const createdNftNames = await Promise.all(
            createdNfts.map(async (x) => {
              const meta = await getMeta(x);
              return meta === null ? "error: NO_NAME" : meta.name;
            })
          );
          setCreatedNfts(createdNfts.map((x, i) => [x, createdNftNames[i]]));

          const currentThumbnailEntry = createdNfts.map((x, i) => [x, i]).find((x) => x[0] === collection.thumbnail);
          setThumbnailIndex(currentThumbnailEntry[1]);
        }
      }
    })();
  }, [props.handle]);

  return (
    <Modal size="lg" centered show={props.show} onHide={props.onHide}>
      <Modal.Header closeButton>
        <Modal.Title>{props.title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form
          className="m-2"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.nativeEvent.stopImmediatePropagation();

            if (props.onSubmit !== null && props.onSubmit !== undefined) {
              props.onSubmit({
                thumbnail: createdNfts[thumbnailIndex][0],
                name: name,
                handle: props.handle,
                description: description
              });
            }
          }}
        >
          <Form.Group className="mb-3">
            <Form.Label>
              <b>Thumbnail image (*required)</b>
            </Form.Label>
            {createdNfts === null && (
              <div>
                <Form.Select disabled />
                <Form.Text className="text-danger" isinvalid={false}>
                  You need to create an NFT to select as thumbnail image
                </Form.Text>
              </div>
            )}
            {createdNfts !== null && thumbnailIndex !== null && (
              <div>
                <Form.Select
                  isValid={true}
                  value={thumbnailIndex}
                  onChange={(e) => setThumbnailIndex(e.target.value)}
                >
                  {createdNfts.map((x, i) => (
                    <option key={i} value={i} >
                      {x[1]}
                    </option>
                  ))}
                </Form.Select>
                <Form.Text className="text-muted">
                  Select a thumbnail image for your collection, using the cover
                  image of one of your NFT creations.
                </Form.Text>
              </div>
            )}
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>
              <b>Collection name (*required)</b>
            </Form.Label>
            <Form.Control
              type="text"
              placeholder="Max 40 characters"
              value={name}
              onChange={(e) => setName(e.target.value)}
              isValid={name !== "" && name.length <= 40}
              isInvalid={name === "" || name.length > 40}
            />
            {name === "" && (
              <div>
                <Form.Text className="input-error">Name required</Form.Text>
              </div>
            )}
            {name !== "" && name.length > 40 && (
              <div>
                <Form.Text className="input-error">Name too long</Form.Text>
              </div>
            )}
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Collection description (optional)</Form.Label>
            <Form.Control
              type="text"
              placeholder="Max 500 characters"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              isValid={description !== "" && description.length <= 500}
              isInvalid={description !== "" && description.length > 500}
            />
            {description !== "" && description.length > 500 && (
              <div>
                <Form.Text className="input-error">
                  Description too long
                </Form.Text>
              </div>
            )}
          </Form.Group>
          <div className="text-center">
            <Button
              className="mt-2 px-4"
              variant="primary"
              type="submit"
              disabled={
                thumbnailIndex === null ||
                name === "" ||
                name.length > 40 ||
                description.length > 500
              }
            >
              Submit
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
}

export default EditCollectionModal;
