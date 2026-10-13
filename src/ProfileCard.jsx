import React from "react";
import { Container } from "react-bootstrap";
import { getProfile, getPreviewLink } from "./storage";
import { getProfileCreatedCount, getProfileHistoricalCount, getProfileCollectionCount } from "./api";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faList,
  faThLarge,
  faShoppingBag
} from "@fortawesome/free-solid-svg-icons";

function ProfileCard(props) {
  const domRef = React.useRef();
  const [isVisible, setVisible] = React.useState(false);
  const [previewLink, setPreviewLink] = React.useState(null);
  const [profile, setProfile] = React.useState(undefined);
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
      if (isVisible && props.address !== null) {
        const profile = await getProfile(props.address);
        setProfile(profile);

        if (profile !== null && profile.thumbnail !== null && profile.thumbnail !== undefined) {
          setPreviewLink(getPreviewLink(profile.thumbnail));
        }

        setStats( {
          createdCount: await getProfileCreatedCount({owner: props.address}),
          collectionCount: await getProfileCollectionCount({owner: props.address}),
          historicalCount: await getProfileHistoricalCount({owner: props.address})
        });
      }
    })();
  }, [isVisible, props.address]);

  return (
    <Container className="profile-card-holder" ref={domRef}>
      {profile === undefined ||
        (stats === null && (
          <div className="profile-card d-flex flex-column">
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
      {profile !== undefined && stats !== null && (
        <div className="profile-card d-flex flex-row">
          <img
            className="my-auto ms-4 me-3"
            src={previewLink === null ? getPreviewLink('DP7CwNZ2AwbvYmFU5bQ8m49AUYLeTePsLt') : previewLink}
            alt=""
          />
          <div className="my-auto d-flex flex-column me-auto">
            <span className="title text-truncate text-start me-auto ms-0">
              {profile !== null && profile.name}
              {profile === null && <span className="text-muted">Unnamed profile</span>}
            </span>
            <div className="card-sub-body text-muted me-auto">
              <span className="ms-auto">
                <FontAwesomeIcon icon={faList} />{" "}
                {stats === null ? "-" : stats.createdCount}
              </span>
              &nbsp;&nbsp;&nbsp;
              <span>
                <FontAwesomeIcon icon={faThLarge} />{" "}
                {stats === null ? "-" : stats.collectionCount}
              </span>
              &nbsp;&nbsp;&nbsp;
              <span className="me-auto">
                <FontAwesomeIcon icon={faShoppingBag} />{" "}
                {stats === null ? "-" : stats.historicalCount - stats.createdCount}
              </span>
            </div>
          </div>
        </div>
      )}
    </Container>
  );
}

export default ProfileCard;
