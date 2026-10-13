import { Modal, Button, Form } from "react-bootstrap";
import React from "react";
import { getProfileHistoricalNfts } from "./api";
import { getMeta, getProfile } from "./storage";

function EditProfileModal(props) {
  const [createdNfts, setCreatedNfts] = React.useState(null);
  const [thumbnailIndex, setThumbnailIndex] = React.useState(undefined);
  const [name, setName] = React.useState("");

  React.useEffect(() => {
    (async () => {
      if (props.address !== undefined && props.address !== null) {
        const profile = await getProfile(props.address);
        if (profile === null) {
          setName("");
        } else {
          setName(profile.name);
        }

        const createdNfts = (
          await getProfileHistoricalNfts({ owner: props.address })
        ).results.reverse();

        let createdNftNames = await Promise.all(
          createdNfts.map(async (x) => {
            const meta = await getMeta(x);
            return meta === null ? "error: NO_NAME" : meta.name;
          })
        );
        setCreatedNfts(
          [[null, "(No profile image)"]].concat(
            createdNfts.map((x, i) => [x, createdNftNames[i]])
          )
        );

        const currentThumbnailEntry = [null]
          .concat(createdNfts)
          .map((x, i) => [x, i])
          .find(
            (x) =>
              x[0] ===
              (profile === null || profile.thumbnail === undefined
                ? null
                : profile.thumbnail)
          );
        setThumbnailIndex(currentThumbnailEntry[1]);
      }
    })();
  }, [props.address]);

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
                address: props.address,
                thumbnail: createdNfts[thumbnailIndex][0],
                name: name,
              });
            }
          }}
        >
          <Form.Group className="mb-3">
            <Form.Label>Profile image (optional)</Form.Label>
            {createdNfts === null && (
              <div>
                <Form.Select disabled />
                <Form.Text className="text-danger" isinvalid={false}>
                  You need to create an NFT to select as thumbnail image
                </Form.Text>
              </div>
            )}
            {createdNfts !== null && thumbnailIndex !== undefined && (
              <div>
                <Form.Select
                  isValid={true}
                  value={thumbnailIndex}
                  onChange={(e) => setThumbnailIndex(e.target.value)}
                >
                  {createdNfts.map((x, i) => (
                    <option key={i} value={i}>
                      {x[1]}
                    </option>
                  ))}
                </Form.Select>
                <Form.Text className="text-muted">
                  Select a thumbnail image for your collection, using the cover
                  image of one of your created/owned NFTs.
                </Form.Text>
              </div>
            )}
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Profile name (optional)</Form.Label>
            <Form.Control
              type="text"
              placeholder="Max 40 characters"
              value={name}
              onChange={(e) => setName(e.target.value)}
              isValid={name.length <= 40}
              isInvalid={name.length > 40}
            />
            {name.length > 40 && (
              <div>
                <Form.Text className="input-error">Name too long</Form.Text>
              </div>
            )}
          </Form.Group>
          <div className="text-center">
            <Button
              className="mt-2 px-4"
              variant="primary"
              type="submit"
              disabled={thumbnailIndex === null || name.length > 40}
            >
              Submit
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
}

export default EditProfileModal;
