import { Modal, Button, Form } from "react-bootstrap";
import React from "react";
import { getMeta } from "./storage";
import { getProfileCreatedNfts } from "./api";

function CreateCollectionModal(props) {
  const [createdNfts, setCreatedNfts] = React.useState(null);
  const [thumbnail, setThumbnail] = React.useState(null);
  const [name, setName] = React.useState("");
  const [handle, setHandle] = React.useState("");
  const [description, setDescription] = React.useState("");

  React.useEffect(() => {
    (async () => {
      if (props.owner !== undefined && props.owner !== null) {

        const createdNfts = (await getProfileCreatedNfts({ owner: props.owner })).results.reverse();
        if (createdNfts.length > 0) {
          const createdNftNames = await Promise.all(
            createdNfts.map(async (x) => {
              const meta = await getMeta(x);
              return meta === null ? "error: NO_NAME" : meta.name;
            })
          );
          setCreatedNfts(createdNfts.map((x, i) => [x, createdNftNames[i]]));
          setThumbnail(createdNfts[0]);
        }
      }
    })();
  }, [props.owner]);

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
                thumbnail: thumbnail,
                name: name,
                handle: handle,
                description: description,
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
                <Form.Text className="text-danger" isInvalid={false}>
                  You need to create an NFT to select as thumbnail image
                </Form.Text>
              </div>
            )}
            {createdNfts !== null && (
              <div>
                <Form.Select
                  isValid={true}
                  value={thumbnail}
                  onChange={(e) => setThumbnail(e.target.value)}
                >
                  {createdNfts.map((x) => (
                    <option key={x[0]} value={x[0]}>
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
            <Form.Label>
              <b>Collection handle (*required)</b>
            </Form.Label>
            <Form.Control
              type="text"
              placeholder="Max 40 characters"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              isValid={handle !== "" && handle.length <= 40}
              isInvalid={handle === "" || handle.length > 40}
            />
            {handle === "" && (
              <div>
                <Form.Text className="input-error">Handle required</Form.Text>
              </div>
            )}
            {handle !== "" && handle.length > 40 && (
              <div>
                <Form.Text className="input-error">Handle too long</Form.Text>
              </div>
            )}
            {handle !== "" && !handle.match(/^([a-z0-9])+$/) && (
              <div>
                <Form.Text className="input-error">
                  Incorrect handle format (only lowercase alphanumeric
                  characters allowed)
                </Form.Text>
              </div>
            )}
            <Form.Text className="text-muted">
              Used for your collection's permalink. You can't change this after
              creating the collection.
            </Form.Text>
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
                thumbnail === null ||
                name === "" ||
                name.length > 40 ||
                handle === "" ||
                handle.length > 40 ||
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

export default CreateCollectionModal;
