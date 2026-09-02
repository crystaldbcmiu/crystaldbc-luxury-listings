import { useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Muted, Text } from "@/components/ui/Themed";
import Glyph from "@/components/ui/Glyph";
import apiClient, { getApiErrorMessage } from "@/lib/apiClient";
import { getMediaUrl } from "@/lib/media";
import { colors } from "@/lib/theme";

interface ChatProperty {
  id: string;
  title: string;
  location: string;
  price: string;
  beds: number;
  baths: number;
  sqft: string;
  image: string;
  status: string;
}

interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  properties?: ChatProperty[];
}

export default function ChatScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "bot",
      text: t("chat.welcome", "Hello! I'm the CrystalDBC assistant. Ask me about our properties or services."),
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    const userMessage: ChatMessage = { id: `u-${Date.now()}`, sender: "user", text: trimmed };
    // The API expects prior turns as { sender, text }.
    const history = messages.map(({ sender, text }) => ({ sender, text }));

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setSending(true);

    try {
      const { data } = await apiClient.post<{ response: string; properties?: ChatProperty[] }>("/chat", {
        message: trimmed,
        history,
      });

      setMessages((current) => [
        ...current,
        {
          id: `b-${Date.now()}`,
          sender: "bot",
          text: data.response,
          properties: data.properties?.length ? data.properties : undefined,
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        { id: `e-${Date.now()}`, sender: "bot", text: getApiErrorMessage(error) },
      ]);
    } finally {
      setSending(false);
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      className="flex-1 bg-background"
    >
      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerClassName="gap-3 p-4"
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((message) => {
          const isUser = message.sender === "user";
          return (
            <View key={message.id} className={`max-w-[85%] ${isUser ? "self-end" : "self-start"}`}>
              <View
                className={`rounded-lg p-3 ${isUser ? "bg-luxury-gold" : "border border-border bg-card"}`}
              >
                <Text className={isUser ? "text-accent-foreground" : "text-foreground"}>{message.text}</Text>
              </View>

              {message.properties?.length ? (
                <View className="mt-2 gap-2">
                  {message.properties.map((property) => {
                    const image = getMediaUrl(property.image);
                    return (
                      <Pressable
                        key={property.id}
                        accessibilityRole="button"
                        onPress={() =>
                          router.push({ pathname: "/property/[propertyId]", params: { propertyId: property.id } })
                        }
                        className="flex-row overflow-hidden rounded-md border border-border bg-card"
                      >
                        <View className="h-20 w-20 bg-muted">
                          {image ? (
                            <Image source={{ uri: image }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                          ) : null}
                        </View>
                        <View className="flex-1 justify-center gap-0.5 p-2.5">
                          <Text variant="label" numberOfLines={1}>
                            {property.title}
                          </Text>
                          <Muted numberOfLines={1} className="text-xs">
                            {property.location}
                          </Muted>
                          <Text className="text-sm font-semibold text-luxury-gold">{property.price}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </View>
          );
        })}

        {sending ? (
          <View className="self-start rounded-lg border border-border bg-card p-3">
            <ActivityIndicator size="small" color={colors.gold} />
          </View>
        ) : null}
      </ScrollView>

      <View className="flex-row items-end gap-2 border-t border-border bg-card p-3">
        <TextInput
          value={input}
          onChangeText={setInput}
          onSubmitEditing={send}
          placeholder={t("chat.placeholder", "Ask about properties...")}
          placeholderTextColor={colors.mutedForeground}
          multiline
          className="max-h-28 flex-1 rounded-md border border-border bg-background px-3 py-2.5 text-base text-foreground"
          returnKeyType="send"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("chat.send", "Send")}
          onPress={send}
          disabled={sending || !input.trim()}
          className={`h-11 w-11 items-center justify-center rounded-full ${
            sending || !input.trim() ? "bg-muted" : "bg-luxury-gold"
          }`}
        >
          <Glyph name="send" size={18} color={sending || !input.trim() ? colors.mutedForeground : colors.background} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
