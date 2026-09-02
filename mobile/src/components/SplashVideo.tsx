import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, useWindowDimensions, View } from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";

const SOURCE = require("../../assets/videosplashcrystal.mp4");

/**
 * Brand video shown once on cold start, over the top of the app.
 *
 * The letterbox above/below the square clip uses the same pure black as the
 * video itself so the bars disappear into the frame. A hard timeout backs up
 * the "finished" event: if the file ever fails to decode, the overlay still
 * goes away instead of trapping the user.
 *
 * The source is square. We size the player to the shorter screen edge (so it
 * always fits), then nudge the scale up a little for a mild zoom — enough to
 * feel full without the hard crop of "cover". Width and height come from
 * useWindowDimensions, so rotation and tablets recompute the frame on their own.
 */
const MAX_DURATION_MS = 8000;
const FADE_OUT_MS = 400;
/** Mild zoom past a perfect fit — 1 is contain, cover is roughly 1.5–2 on phones. */
const ZOOM = 1.22;
/** Matches the black in videosplashcrystal.mp4 — not the app navy (#131720). */
const VIDEO_BLACK = "#000000";

const SplashVideo = ({ onFinish }: { onFinish?: () => void }) => {
  const [isVisible, setIsVisible] = useState(true);
  const opacity = useRef(new Animated.Value(1)).current;
  const hasDismissed = useRef(false);
  const { width, height } = useWindowDimensions();

  // Square frame locked to the shorter axis, then scaled up by ZOOM. Overflow is
  // clipped by the outer fill, so the zoom just trims the edges a little.
  const side = Math.min(width, height) * ZOOM;

  const player = useVideoPlayer(SOURCE, (instance) => {
    instance.loop = false;
    instance.muted = false;
    instance.volume = 1;
    instance.play();
  });

  useEffect(() => {
    const dismiss = () => {
      if (hasDismissed.current) return;
      hasDismissed.current = true;

      Animated.timing(opacity, {
        toValue: 0,
        duration: FADE_OUT_MS,
        useNativeDriver: true,
      }).start(() => {
        setIsVisible(false);
        onFinish?.();
      });
    };

    const subscription = player.addListener("playToEnd", dismiss);
    const timeout = setTimeout(dismiss, MAX_DURATION_MS);

    return () => {
      subscription.remove();
      clearTimeout(timeout);
    };
  }, [player, opacity, onFinish]);

  if (!isVisible) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { opacity, backgroundColor: VIDEO_BLACK, zIndex: 100 }]}
    >
      <View style={[StyleSheet.absoluteFill, styles.center, { overflow: "hidden", backgroundColor: VIDEO_BLACK }]}>
        <VideoView
          player={player}
          style={{ width: side, height: side, backgroundColor: VIDEO_BLACK }}
          contentFit="contain"
          nativeControls={false}
          allowsFullscreen={false}
          allowsPictureInPicture={false}
        />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
});

export default SplashVideo;
