export default function Header({ shopName, tableBadge }) {
  return (
    <div className="header">
      <div className="header-left">
        <span className="table-badge">{tableBadge}</span>
      </div>
      <div className="header-right">
        <span className="shop-name">{shopName}</span>
      </div>
    </div>
  );
}
