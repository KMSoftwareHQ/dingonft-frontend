import { Button, Spinner } from "react-bootstrap";
import { faAngleLeft, faAngleRight } from "@fortawesome/free-solid-svg-icons";
import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

function SideScroller(props) {
  const scrollContainerRef = React.createRef();
  const itemsContainerRef = React.createRef();
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(true);

  // Nothing to measure (or scroll by) while the list is empty.
  const isEmpty = () => itemsContainerRef.current.children.length === 0;

  const onScroll = () => {
    if (isEmpty()) {
      return;
    }
    const firstItem = itemsContainerRef.current.children[0];
    const firstItemLeft = firstItem.offsetLeft;

    const lastItem =
      itemsContainerRef.current.children[
        itemsContainerRef.current.children.length - 1
      ];
    const lastItemRight = lastItem.offsetLeft + lastItem.offsetWidth;

    const borderLeft = scrollContainerRef.current.scrollLeft;
    const borderRight = borderLeft + scrollContainerRef.current.offsetWidth;

    setCanScrollLeft(firstItemLeft < borderLeft);
    setCanScrollRight(lastItemRight > borderRight);
  };

  const scrollLeft = () => {
    if (isEmpty()) {
      return;
    }
    const containerWidth = scrollContainerRef.current.offsetWidth;
    const itemWidth = itemsContainerRef.current.children[0].offsetWidth;
    const scrollCount = Math.floor(containerWidth / itemWidth);
    scrollContainerRef.current.scrollBy({
      left: -scrollCount * itemWidth,
      behavior: "smooth",
    });
  };

  const scrollRight = () => {
    if (isEmpty()) {
      return;
    }
    const containerWidth = scrollContainerRef.current.offsetWidth;
    const itemWidth = itemsContainerRef.current.children[0].offsetWidth;
    const scrollCount = Math.floor(containerWidth / itemWidth);
    scrollContainerRef.current.scrollBy({
      left: scrollCount * itemWidth,
      behavior: "smooth",
    });
  };

  return (
    <div className="side-scroll">
      <div className="scroll-off">
        <div className="scroll-on" ref={scrollContainerRef} onScroll={onScroll}>
          <ul ref={itemsContainerRef}>
            {props.items === null && (
              <li>
                <div
                  style={{ height: props.defaultHeight, width: "100%" }}
                  className="d-flex flex-row"
                >
                  <Spinner className="mb-auto" animation="border" />
                </div>
              </li>
            )}
            {props.items !== null &&
              props.items.map((x) => props.itemTemplate(x))}
          </ul>
        </div>
      </div>
      {canScrollLeft && (
        <Button className="control float-left" onClick={scrollLeft}>
          <FontAwesomeIcon icon={faAngleLeft} />
        </Button>
      )}
      {canScrollRight && (
        <Button className="control float-right" onClick={scrollRight}>
          <FontAwesomeIcon icon={faAngleRight} />
        </Button>
      )}
    </div>
  );
}

export default SideScroller;
