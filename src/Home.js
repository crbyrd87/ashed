import { font, color, type, weight, space, radius } from "./theme";
import { Button, ClickableRow, Icon, Pressable, SectionLabel, Skeleton } from "./ui";
import { checkinDate, formatSmokeDate } from "./dateUtils";

// The root of the app. Replaces the tab bar: five destinations became eleven,
// which is why the bar had to go.
//
// Two decisions from the design handoff that should not be quietly undone:
//
// 1. "Log a smoke" is the only filled button on this screen. It is not on the
//    owner's task list because it is assumed, but it is the app's purpose, and
//    with the bar gone it needs a permanent home. Nothing else here competes.
//
// 2. Premium rows are NOT badged. Four of the six tasks are paid; marking them
//    all turns the home screen into a sales page. The rows look identical to
//    free ones and the paywall appears on tap, where it can argue for the one
//    feature the person just asked for.

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
};

const Chevron = () => <Icon.Chevron size={17} color={color.textFaint} />;

const Count = ({ n }) => (
  <span style={{ fontFamily: font.mono, fontSize: type.sm, color: color.textMuted }}>{n}</span>
);

export default function Home({
  displayName,
  unreadCount = 0,
  humidorCount,
  wishlistCount,
  recent = [],
  recentLoading = false,
  onSearch,
  onScan,
  onRecommend,
  onPairDrink,
  onPairCigar,
  onLogSmoke,
  onHumidor,
  onWishlist,
  onVenues,
  onFriends,
  onFeed,
  onNotifications,
  onProfile,
}) {
  const firstName = (displayName || "").trim().split(" ")[0];
  const divider = { borderBottom: `1px solid ${color.border}` };

  return (
    <div style={{
      minHeight: "100vh",
      background: color.bg,
      fontFamily: font.sans,
      maxWidth: 420,
      margin: "0 auto",
      paddingTop: "env(safe-area-inset-top)",
      paddingBottom: "calc(40px + env(safe-area-inset-bottom))",
    }}>
      {/* Masthead */}
      <div style={{ display: "flex", alignItems: "center", padding: "14px 20px 0" }}>
        <div style={{
          flex: 1,
          fontFamily: font.display, fontSize: type.lg, fontWeight: weight.displayMed,
          letterSpacing: "0.06em", color: color.textPrimary,
        }}>
          Ashed
        </div>
        <Pressable onClick={onNotifications} label="Notifications" minWidth={44}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
          <Icon.Bell size={21} color={color.textMuted} />
          {unreadCount > 0 && (
            <span style={{
              position: "absolute", top: 6, right: 6,
              minWidth: 16, height: 16, borderRadius: 8, padding: "0 4px",
              background: color.alert, color: color.bg,
              fontFamily: font.mono, fontSize: 11, lineHeight: "16px", textAlign: "center",
            }}>
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Pressable>
        <Pressable onClick={onProfile} label="Your profile" minWidth={44}
          style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{
            width: 30, height: 30, borderRadius: "50%",
            border: `1px solid ${color.borderStrong}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: font.display, fontSize: type.sm, color: color.textBody,
          }}>
            {(firstName[0] || "?").toUpperCase()}
          </span>
        </Pressable>
      </div>

      {/* The question */}
      <div style={{ padding: "18px 20px 22px" }}>
        <div style={{
          fontFamily: font.display, fontSize: type.xxl, fontWeight: weight.displayLight,
          color: color.textPrimary, lineHeight: 1.15,
        }}>
          {greeting()}{firstName ? `, ${firstName}` : ""}.
        </div>
        <div style={{
          fontFamily: font.display, fontSize: type.xxl, fontWeight: weight.displayLight,
          color: color.textMuted, lineHeight: 1.15,
        }}>
          What are you after?
        </div>
      </div>

      {/* The one filled button on this screen */}
      <div style={{ padding: "0 20px 24px" }}>
        <Button onClick={onLogSmoke} style={{ height: 56, borderRadius: radius.md }}>
          <Icon.Plus size={19} color={color.bg} /> Log a smoke
        </Button>
      </div>

      {/* Tasks */}
      <div style={{ padding: "0 20px" }}>
        <div style={divider} />
        <ClickableRow icon={<Icon.Search size={21} />} label="Search for a cigar"
          trailing={<Chevron />} onClick={onSearch} style={divider} />
        <ClickableRow icon={<Icon.Scan size={21} />} label="Scan a cigar band"
          trailing={<Chevron />} onClick={onScan} style={divider} />
        <ClickableRow icon={<Icon.Recommend size={21} />} label="Get a recommendation"
          trailing={<Chevron />} onClick={onRecommend} style={divider} />
        <ClickableRow icon={<Icon.Drink size={21} />} label="Pair a drink with my cigar"
          trailing={<Chevron />} onClick={onPairDrink} style={divider} />
        <ClickableRow icon={<Icon.Cigar size={21} />} label="Pair a cigar with my drink"
          trailing={<span style={{ fontSize: type.xs, color: color.gold }}>Soon</span>}
          onClick={onPairCigar} style={divider} />
      </div>

      {/* Places, rather than tasks. The count does the job a tab badge used to. */}
      <div style={{ padding: "28px 20px 0" }}>
        <SectionLabel rule style={{ marginBottom: 4 }}>Yours</SectionLabel>
        <ClickableRow icon={<Icon.Humidor size={21} />} label="Humidor"
          trailing={humidorCount === undefined ? <Chevron /> : <Count n={humidorCount} />}
          onClick={onHumidor} style={divider} />
        <ClickableRow icon={<Icon.Wishlist size={21} />} label="Wishlist"
          trailing={wishlistCount === undefined ? <Chevron /> : <Count n={wishlistCount} />}
          onClick={onWishlist} style={divider} />
        <ClickableRow icon={<Icon.Venue size={21} />} label="Shops & lounges"
          trailing={<Chevron />} onClick={onVenues} style={divider} />
        <ClickableRow icon={<Icon.Friends size={21} />} label="Friends"
          trailing={<Chevron />} onClick={onFriends} style={divider} />
      </div>

      {/* A two-row tail: the feed is one option among many, but a returning
          reader still sees movement without hunting for it. */}
      <div style={{ padding: "28px 20px 0" }}>
        <SectionLabel
          rule
          action={
            <Pressable onClick={onFeed} minHeight={0}
              style={{ fontSize: type.xs, color: color.gold, whiteSpace: "nowrap" }}>
              Activity feed
            </Pressable>
          }
          style={{ marginBottom: 10 }}
        >
          Lately
        </SectionLabel>

        {recentLoading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 6 }}>
            <Skeleton width="70%" height={17} />
            <Skeleton width="45%" height={13} />
          </div>
        )}

        {!recentLoading && recent.length === 0 && (
          <div style={{ fontSize: type.sm, color: color.textFaint, paddingTop: 4 }}>
            Nothing from your friends yet.
          </div>
        )}

        {!recentLoading && recent.map((c) => {
          const name = [c.cigar_brand, c.cigar_name].filter(Boolean).join(" ") || "A cigar";
          const who = c.users?.username || "Someone";
          const flames = c.rating != null ? (c.rating / 2).toFixed(1) : null;
          return (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: space.md, padding: "12px 0", ...divider }}>
              <span style={{
                width: 30, height: 30, flexShrink: 0, borderRadius: "50%",
                border: `1px solid ${color.borderStrong}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: font.display, fontSize: type.xs, color: color.textMuted,
              }}>
                {who[0].toUpperCase()}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{
                  display: "block",
                  fontFamily: font.display, fontSize: type.md, color: color.textPrimary,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {name}
                </span>
                <span style={{ display: "block", fontSize: type.xs, color: color.textFaint, marginTop: 1 }}>
                  {who} · {formatSmokeDate(checkinDate(c))}
                </span>
              </span>
              {flames && (
                <span style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                  <Icon.Flame size={15} />
                  <span style={{ fontFamily: font.mono, fontSize: type.sm, color: color.textBody }}>{flames}</span>
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
