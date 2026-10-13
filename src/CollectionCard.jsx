import React from "react";
import { Container } from "react-bootstrap";
import { getCollection, getPreviewLink } from "./storage";
import { getCollectionStats } from "./api";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faList,
  faCashRegister,
  faExchangeAlt,
} from "@fortawesome/free-solid-svg-icons";
import { toLocaleString } from "./utils";

function CollectionCard(props) {
  const domRef = React.useRef();
  const [isVisible, setVisible] = React.useState(false);
  const [previewLink, setPreviewLink] = React.useState(null);
  const [collection, setCollection] = React.useState(null);
  const [stats, setStats] = React.useState(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setVisible(true);
        }
      });
    });
    const element = domRef.current;
    observer.observe(element);
    return () => observer.unobserve(element);
  }, []);

  React.useEffect(() => {
    (async () => {
      if (isVisible) {
        const collection = await getCollection(props.handle);
        setCollection(collection);

        if (collection !== null) {
          setPreviewLink(getPreviewLink(collection.thumbnail));

          const stats = await getCollectionStats({ handle: props.handle });
          setStats(stats);
        }
      }
    })();
  }, [isVisible, props.handle]);

  return (
    <Container className="collection-card-holder" ref={domRef}>
      {collection === null ||
        (stats === null && (
          <div className="collection-card d-flex flex-column">
            <div className="d-flex flex-row my-auto">
              <div className="spinner mx-auto">
                <div
                  className="spinner-border text-primary"
                  role="status"
                ></div>
              </div>
            </div>
          </div>
        ))}
      {collection !== null && stats !== null && (
        <div className="collection-card d-flex flex-column">
          <img className="mx-auto mt-4 mb-3" src={previewLink} alt="" />
          <span className="mx-auto title">
            {collection !== null && collection.name}
          </span>
          <span className="truncate text-muted description">
            {collection !== null && collection.description}
          </span>
          <hr className="mt-auto" />
          <div className="d-flex flex-row text-muted card-sub-body">
            <span className="ms-auto">
              <FontAwesomeIcon icon={faList} />{" "}
              {stats === null ? "-" : stats.count}
            </span>
            &nbsp;&nbsp;&nbsp;
            <span>
              <FontAwesomeIcon icon={faCashRegister} />{" "}
              {stats === null ? "-" : toLocaleString(stats.tradeVolume)}
            </span>
            &nbsp;&nbsp;&nbsp;
            <span className="me-auto">
              <FontAwesomeIcon icon={faExchangeAlt} />{" "}
              {stats === null ? "-" : stats.tradeCount}
            </span>
          </div>
        </div>
      )}
    </Container>
  );
}

export default CollectionCard;
