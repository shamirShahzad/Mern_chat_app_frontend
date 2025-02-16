import {
  Box,
  VStack,
  HStack,
  Text,
  Input,
  Button,
  Flex,
  Icon,
  Avatar,
  InputGroup,
  InputRightElement,
  useToast,
} from "@chakra-ui/react";
import { FiSend, FiInfo, FiMessageCircle } from "react-icons/fi";
import UsersList from "./UsersList";
import { useEffect, useRef, useState } from "react";
import axios from "axios";

const ChatArea = ({ selectedGroup, socket }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const toast = useToast();

  const currentUser = JSON.parse(localStorage.getItem("userInfo"));

  const fetchMessages = async () => {
    try {
      const { data } = await axios.get(
        `http://localhost:3000/api/messages/${selectedGroup._id}`,
        {
          headers: {
            auth: `Bearer ${currentUser.token}`,
          },
        }
      );
      setMessages(data);
    } catch (err) {
      toast({
        title: "Error",
        description: err.response.data.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Send Message

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    try {
      const token = currentUser.token;
      const { data } = await axios.post(
        `http://localhost:3000/api/messages`,
        {
          group: selectedGroup?._id,
          content: newMessage,
        },
        { headers: { auth: `Bearer ${token}` } }
      );
      socket.emit("new message", {
        ...data,
        groupId: selectedGroup?._id,
      });
      setMessages([...messages, data]);
      setNewMessage("");
    } catch (err) {
      toast({
        title: "Error Sending Message",
        description: err.response.data.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Handle Typing

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    if (!isTyping && selectedGroup) {
      setIsTyping(true);
      socket.emit("typing", {
        groupId: selectedGroup._id,
        username: currentUser.username,
      });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      if (selectedGroup) {
        socket.emit("stop typing", {
          groupId: selectedGroup._id,
        });
      }
      setIsTyping(false);
    }, 2000);
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  //Render Typing indicator
  const renderTypingIndicator = () => {
    if (typingUsers.size === 0) return null;

    const typingUsersArray = Array.from(typingUsers);

    return typingUsersArray.map((username) => (
      <Box
        key={username}
        alignSelf={
          username === currentUser.username ? "flex-start" : "flex-end"
        }
        maxW={"70%"}
      >
        <Flex
          align={"center"}
          bg={username === currentUser.username ? "blue.50" : "gray.50"}
          p={2}
          borderRadius="lg"
          gap={2}
        >
          {username === currentUser.username ? (
            <>
              <Avatar size={"xs"} name={username} />
              <Flex align="center" gap={1}>
                <Text fontSize="sm" color="gray.500" fontStyle="italic">
                  You are Typing
                </Text>
                <Flex gap={1}>
                  {[1, 2, 3].map((dot) => (
                    <Box
                      key={dot}
                      w="3px"
                      h="3px"
                      borderRadius="full"
                      bg="gray.500"
                    />
                  ))}
                </Flex>
              </Flex>
            </>
          ) : (
            <>
              <Flex align="center" gap={1}>
                <Text fontSize="sm" color="gray.500" fontStyle="italic">
                  {username} is Typing
                </Text>
                <Flex gap={1}>
                  {[1, 2, 3].map((dot) => (
                    <Box
                      key={dot}
                      w="3px"
                      h="3px"
                      borderRadius="full"
                      bg="gray.500"
                    />
                  ))}
                </Flex>
              </Flex>
              <Avatar size={"xs"} name={username} />
            </>
          )}
        </Flex>
      </Box>
    ));
  };

  useEffect(() => {
    if (selectedGroup && socket) {
      //fetch messages
      fetchMessages();
      socket.emit("Join Room", selectedGroup._id);
      socket.on("message received", (newMessage) => {
        setMessages((prev) => [...prev, newMessage]);
      });
      socket.on("users in room", (users) => {
        console.log("USERS", users);
        setConnectedUsers(users);
      });

      socket.on("user joined", (user) => {
        setConnectedUsers((prev) => [...prev, user]);
      });

      socket.on("user left", (user) => {
        setConnectedUsers((prev) => {
          return prev.filter((u) => u._id !== user._id);
        });
      });

      socket.on("notification", (notification) => {
        toast({
          title:
            notification.type === "USER_JOINED" ? "New User" : "Notification",
          description: notification.message,
          status: "info",
          duration: 5000,
          isClosable: true,
          position: "top-right",
        });
      });

      socket.on("user typing", (user) => {
        setTypingUsers((prev) => new Set(prev).add(user));
      });

      socket.on("user stopped typing", (user) => {
        setTypingUsers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(user);
          return newSet;
        });
      });

      return () => {
        socket.emit("Leave Room", selectedGroup._id);
        socket.off("message received");
        socket.off("users in room");
        socket.off("user joined");
        socket.off("user left");
        socket.off("notification");
        socket.off("user typing");
        socket.off("user stopped typing");
      };
    }
  }, [selectedGroup, socket, toast]);
  // Sample data for demonstration
  const sampleMessages = [
    {
      id: 1,
      content: "Hey team! Just pushed the new updates to staging.",
      sender: { username: "Sarah Chen" },
      createdAt: "10:30 AM",
      isCurrentUser: false,
    },
    {
      id: 2,
      content: "Great work! The new features look amazing 🚀",
      sender: { username: "Alex Thompson" },
      createdAt: "10:31 AM",
      isCurrentUser: false,
    },
    {
      id: 3,
      content: "Thanks! Let's review it in our next standup.",
      sender: { username: "You" },
      createdAt: "10:32 AM",
      isCurrentUser: true,
    },
  ];

  const sampleUsers = [
    { id: 1, username: "Sarah Chen", isOnline: true },
    { id: 2, username: "Alex Thompson", isOnline: true },
    { id: 3, username: "John Doe", isOnline: false },
  ];

  return (
    <Flex h="100%" position="relative">
      <Box
        flex="1"
        display="flex"
        flexDirection="column"
        bg="gray.50"
        maxW={`calc(100% - 260px)`}
      >
        {/* Chat Header */}
        {selectedGroup ? (
          <>
            <Flex
              px={6}
              py={4}
              bg="white"
              borderBottom="1px solid"
              borderColor="gray.200"
              align="center"
              boxShadow="sm"
            >
              <Icon
                as={FiMessageCircle}
                fontSize="24px"
                color="blue.500"
                mr={3}
              />
              <Box flex="1">
                <Text fontSize="lg" fontWeight="bold" color="gray.800">
                  {selectedGroup.name}
                </Text>
                <Text fontSize="sm" color="gray.500">
                  {selectedGroup.description}
                </Text>
              </Box>
              <Icon
                as={FiInfo}
                fontSize="20px"
                color="gray.400"
                cursor="pointer"
                _hover={{ color: "blue.500" }}
              />
            </Flex>

            {/* Messages Area */}
            <VStack
              flex="1"
              overflowY="auto"
              spacing={4}
              align="stretch"
              px={6}
              py={4}
              position="relative"
              sx={{
                "&::-webkit-scrollbar": {
                  width: "8px",
                },
                "&::-webkit-scrollbar-track": {
                  width: "10px",
                },
                "&::-webkit-scrollbar-thumb": {
                  background: "gray.200",
                  borderRadius: "24px",
                },
              }}
            >
              {messages.map((message) => (
                <Box
                  key={message._id}
                  alignSelf={
                    message.sender._id === currentUser?._id
                      ? "flex-start"
                      : "flex-end"
                  }
                  maxW="70%"
                >
                  <Flex direction="column" gap={1}>
                    <Flex
                      align="center"
                      mb={1}
                      justifyContent={
                        message.sender._id === currentUser?._id
                          ? "flex-start"
                          : "flex-end"
                      }
                      gap={2}
                    >
                      {message.sender._id === currentUser?._id ? (
                        <>
                          <Avatar size="xs" name={message.sender.username} />
                          <Text fontSize="xs" color="gray.500">
                            You • {formatTime(message.createdAt)}
                          </Text>
                        </>
                      ) : (
                        <>
                          <Text fontSize="xs" color="gray.500">
                            {message.sender.username} •{" "}
                            {formatTime(message.createdAt)}
                          </Text>
                          <Avatar size="xs" name={message.sender.username} />
                        </>
                      )}
                    </Flex>

                    <Box
                      bg={
                        message?.sender?._id === currentUser?._id
                          ? "blue.500"
                          : "white"
                      }
                      color={
                        message.sender._id === currentUser?._id
                          ? "white"
                          : "gray.800"
                      }
                      p={3}
                      borderRadius="lg"
                      boxShadow="sm"
                    >
                      <Text>{message.content}</Text>
                    </Box>
                  </Flex>
                </Box>
              ))}
              {renderTypingIndicator()}
              <div ref={messagesEndRef}></div>
            </VStack>

            {/* Message Input */}
            <Box
              p={4}
              bg="white"
              borderTop="1px solid"
              borderColor="gray.200"
              position="relative"
              zIndex="1"
            >
              <InputGroup size="lg">
                <Input
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={handleTyping}
                  pr="4.5rem"
                  bg="gray.50"
                  border="none"
                  _focus={{
                    boxShadow: "none",
                    bg: "gray.100",
                  }}
                />
                <InputRightElement width="4.5rem">
                  <Button
                    h="1.75rem"
                    size="sm"
                    onClick={sendMessage}
                    colorScheme="blue"
                    borderRadius="full"
                    _hover={{
                      transform: "translateY(-1px)",
                    }}
                    transition="all 0.2s"
                  >
                    <Icon as={FiSend} />
                  </Button>
                </InputRightElement>
              </InputGroup>
            </Box>
          </>
        ) : (
          <>
            <Flex
              h="100%"
              direction="column"
              align="center"
              justify="center"
              p={8}
              textAlign="center"
            >
              <Icon
                as={FiMessageCircle}
                fontSize="64px"
                color="gray.300"
                mb={4}
              />
              <Text fontSize="xl" fontWeight="medium" color="gray.500" mb={2}>
                Welcome to the chat
              </Text>
              <Text color="gray.500" mb={2}>
                Select a group to begin chatting
              </Text>
            </Flex>
          </>
        )}
      </Box>

      {/* UsersList with fixed width */}
      <Box
        width="260px"
        position="sticky"
        right={0}
        top={0}
        height="100%"
        flexShrink={0}
      >
        {selectedGroup && <UsersList users={connectedUsers} />}
      </Box>
    </Flex>
  );
};

export default ChatArea;
