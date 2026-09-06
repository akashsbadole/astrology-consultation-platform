import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api, type ChatMessage } from '../../lib/api';
import { useAuthStore } from '../../lib/store';
import { colors, radius, spacing, type } from '../../theme/tokens';

type DisplayMessage = ChatMessage & { isOwn: boolean };

export default function ConsultationChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<import('socket.io-client').Socket | null>(null);
  const flatListRef = useRef<FlatList<DisplayMessage>>(null);

  const consultation = useQuery({
    queryKey: ['consultation', id],
    queryFn: () => api.getConsultation(id!),
    enabled: !!id,
  });

  const astrologer = useQuery({
    queryKey: ['astrologer', consultation.data?.astrologer_id],
    queryFn: () => api.getAstrologer(consultation.data!.astrologer_id),
    enabled: !!consultation.data?.astrologer_id,
  });

  const balance = useQuery({
    queryKey: ['wallet-balance'],
    queryFn: () => api.getWalletBalance(),
    refetchInterval: 10_000,
  });

  const messagesQuery = useQuery({
    queryKey: ['consultation-messages', id],
    queryFn: () => api.getConsultationMessages(id!),
    enabled: !!id,
  });

  const endCall = useMutation({
    mutationFn: () => api.endConsultation(id!),
    onSuccess: () => {
      socketRef.current?.disconnect();
      router.back();
    },
  });

  useEffect(() => {
    if (messagesQuery.data) {
      const own = user?.id;
      setMessages(
        messagesQuery.data.map((m) => ({
          ...m,
          isOwn: m.sender_id === own,
        }))
      );
    }
  }, [messagesQuery.data, user?.id]);

  useEffect(() => {
    const startedAt = consultation.data?.started_at;
    const endedAt = consultation.data?.ended_at;

    if (!startedAt) return;

    if (endedAt) {
      const startMs = new Date(startedAt).getTime();
      const endMs = new Date(endedAt).getTime();
      setElapsed(Math.floor((endMs - startMs) / 1000));
      return;
    }

    const startMs = new Date(startedAt).getTime();
    setElapsed(Math.floor((Date.now() - startMs) / 1000));

    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startMs) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [consultation.data?.started_at, consultation.data?.ended_at]);

  useEffect(() => {
    if (!id || !user?.id) return;
    if (consultation.data?.status === 'ended' || consultation.data?.status === 'expired') return;

    let cancelled = false;

    (async () => {
      const { io } = await import('socket.io-client');

      if (cancelled) return;

      const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';
      const socket = io(apiUrl, {
        auth: { token: user.id },
        transports: ['websocket'],
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        if (cancelled) return;
        setConnected(true);
        socket.emit('join-room', { consultation_id: id });
      });

      socket.on('disconnect', () => {
        if (cancelled) return;
        setConnected(false);
      });

      socket.on('message', (msg: ChatMessage) => {
        if (cancelled) return;
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [
            ...prev,
            { ...msg, isOwn: msg.sender_id === user.id },
          ];
        });
      });

      socket.on('session-ended', () => {
        if (cancelled) return;
        consultation.refetch();
        balance.refetch();
      });
    })();

    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [id, user?.id, consultation.data?.status]);

  const sendMessage = useCallback(() => {
    const text = inputText.trim();
    if (!text || !id || !socketRef.current?.connected) return;

    const optimisticMsg: DisplayMessage = {
      id: `optimistic-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      consultation_id: id,
      sender_id: user?.id ?? '',
      text,
      created_at: new Date().toISOString(),
      isOwn: true,
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setInputText('');

    socketRef.current.emit('message', {
      consultation_id: id,
      text,
    });
  }, [inputText, id, user?.id]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const formatMessageTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isLoading = consultation.isLoading || messagesQuery.isLoading;
  const isError = consultation.isError || messagesQuery.isError;

  return (
    <LinearGradient colors={[colors.midnight, colors.midnightDeep]} style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <View style={styles.topBar}>
            <View style={styles.topBarLeft}>
              <Text style={styles.astrologerName}>
                {astrologer.data?.full_name ?? 'Astrologer'}
              </Text>
              <Text style={styles.timer}>{formatTime(elapsed)}</Text>
            </View>
            <View style={styles.topBarRight}>
              {!connected && consultation.data?.status === 'active' && (
                <View style={styles.reconnecting}>
                  <ActivityIndicator size="small" color={colors.brass} />
                  <Text style={styles.reconnectingText}>Reconnecting...</Text>
                </View>
              )}
              <Text style={styles.balanceBadge}>
                ₹{((balance.data?.balance_paise ?? 0) / 100).toFixed(2)}
              </Text>
            </View>
          </View>

          {isLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.brass} />
              <Text style={styles.statusText}>Loading consultation...</Text>
            </View>
          ) : isError ? (
            <View style={styles.centered}>
              <Text style={styles.errorText}>Failed to load consultation.</Text>
              <Pressable onPress={() => consultation.refetch()} style={styles.retryBtn}>
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(m) => m.id}
              contentContainerStyle={styles.messageList}
              inverted
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              renderItem={({ item }: { item: DisplayMessage }) => (
                <View
                  style={[
                    styles.messageBubble,
                    item.isOwn ? styles.userBubble : styles.astrologerBubble,
                  ]}
                >
                  <Text style={styles.messageText}>{item.text}</Text>
                  <Text style={styles.messageTime}>{formatMessageTime(item.created_at)}</Text>
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Start your consultation...</Text>
                </View>
              }
            />
          )}

          {consultation.data?.status === 'active' && (
            <View style={styles.inputBar}>
              <TextInput
                style={styles.textInput}
                placeholder="Type a message..."
                placeholderTextColor={colors.mistFaint}
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={sendMessage}
                returnKeyType="send"
                editable={connected}
              />
              <Pressable
                style={[styles.sendBtn, (!inputText.trim() || !connected) && styles.sendBtnDisabled]}
                onPress={sendMessage}
                disabled={!inputText.trim() || !connected}
              >
                <Text style={styles.sendBtnText}>↑</Text>
              </Pressable>
            </View>
          )}

          {consultation.data?.status === 'active' && (
            <Pressable
              style={[styles.endCallBtn, endCall.isPending && styles.endCallBtnDisabled]}
              onPress={() => endCall.mutate()}
              disabled={endCall.isPending}
            >
              {endCall.isPending ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.endCallText}>End Call</Text>
              )}
            </Pressable>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.mistFaint,
  },
  topBarLeft: {
    gap: 2,
    flex: 1,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  astrologerName: {
    ...type.label,
    color: colors.parchment,
  },
  timer: {
    ...type.caption,
    color: colors.brass,
    fontVariant: ['tabular-nums'],
  },
  balanceBadge: {
    ...type.label,
    color: colors.parchment,
    backgroundColor: 'rgba(198,161,91,0.15)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  reconnecting: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reconnectingText: {
    ...type.caption,
    color: colors.mist,
    fontSize: 11,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  statusText: {
    ...type.body,
    color: colors.mist,
  },
  errorText: {
    ...type.body,
    color: colors.error,
  },
  retryBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.brass,
    borderRadius: radius.sm,
  },
  retryText: {
    ...type.button,
    color: colors.midnight,
  },
  messageList: {
    padding: spacing.md,
    flexGrow: 1,
  },
  messageBubble: {
    maxWidth: '75%',
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.brass,
  },
  astrologerBubble: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(246,241,231,0.1)',
  },
  messageText: {
    ...type.body,
    color: colors.parchment,
  },
  messageTime: {
    ...type.caption,
    color: colors.mistFaint,
    marginTop: 2,
    fontSize: 10,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...type.body,
    color: colors.mist,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    gap: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.mistFaint,
  },
  textInput: {
    flex: 1,
    backgroundColor: 'rgba(246,241,231,0.08)',
    borderColor: colors.mistFaint,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...type.body,
    color: colors.parchment,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  sendBtnText: {
    ...type.button,
    color: colors.midnight,
    fontSize: 18,
  },
  endCallBtn: {
    margin: spacing.sm,
    backgroundColor: colors.error,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  endCallBtnDisabled: {
    opacity: 0.6,
  },
  endCallText: {
    ...type.button,
    color: colors.white,
  },
});
