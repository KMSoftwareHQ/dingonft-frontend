// Assets.
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleDown } from "@fortawesome/free-solid-svg-icons";

function CustomDivider() {
  return (
    <div className="divider-custom">
      <div className="divider-custom-line mt-2 mb-2"></div>
      <div className="divider-custom-icon mt-2 mb-2">
        <FontAwesomeIcon icon={faAngleDown} />
      </div>
      <div className="divider-custom-line mt-2 mb-2"></div>
    </div>
  );
}

export default CustomDivider;
