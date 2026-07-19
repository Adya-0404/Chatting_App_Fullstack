import React, { useContext, useEffect, useState } from 'react';
import './ChatBox.css';
import assets from '../../assets/assets';
import { AppContext } from '../../context/AppContext';
import { onSnapshot, doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { toast } from 'react-toastify';
import upload from '../../lib/upload';

const ChatBox = () => {
    // FIXED: Added chatVisible and setChatVisible to the context destructuring
    const { userData, messagesId, chatUser, messages, setMessages, chatVisible, setChatVisible } = useContext(AppContext);
    const [input, setInput] = useState("");

    // Send Message Function
    const sendMessage = async () => {
        try {
            if (input.trim() && messagesId) {
                // 1. Update the messages document array
                await updateDoc(doc(db, 'messages', messagesId), {
                    messages: arrayUnion({
                        sId: userData.id,
                        text: input.trim(),
                        createdAt: new Date()
                    })
                });

                // 2. Update the chat list previews for both users
                const userIDs = [chatUser.rId, userData.id];

                userIDs.forEach(async (id) => {
                    const userChatsRef = doc(db, 'chats', id);
                    const userChatsSnapshot = await getDoc(userChatsRef);
                    
                    if (userChatsSnapshot.exists()) {
                        const userChatData = userChatsSnapshot.data();
                        const chatIndex = userChatData.chatsData.findIndex((c) => c.messageId === messagesId);
                        
                        if (chatIndex !== -1) {
                            userChatData.chatsData[chatIndex].lastMessage = input.slice(0, 30);
                            userChatData.chatsData[chatIndex].updatedAt = Date.now();
                            
                            if (userChatData.chatsData[chatIndex].rId === userData.id) {
                                userChatData.chatsData[chatIndex].messageSeen = false;
                            }
                            
                            await updateDoc(userChatsRef, {
                                chatsData: userChatData.chatsData
                            });
                        }
                    }
                });

                // Clear input field after successful send
                setInput("");
            }
        } catch (error) {
            console.error("Send message error: ", error);
            toast.error(error.message);
        }
        
        setInput("");
    };

    // Send Image Function
    const sendImage = async (e) => {
        try {
            const fileUrl = await upload(e.target.files[0]);
            
            if (fileUrl && messagesId) {
                await updateDoc(doc(db, 'messages', messagesId), {
                    messages: arrayUnion({
                        sId: userData.id, 
                        image: fileUrl,
                        createdAt: new Date()
                    })
                });
                
                const userIDs = [chatUser.rId, userData.id];

                userIDs.forEach(async (id) => {
                    const userChatsRef = doc(db, 'chats', id);
                    const userChatsSnapshot = await getDoc(userChatsRef);
                    
                    if (userChatsSnapshot.exists()) {
                        const userChatData = userChatsSnapshot.data();
                        const chatIndex = userChatData.chatsData.findIndex((c) => c.messageId === messagesId);
                        
                        if (chatIndex !== -1) {
                            userChatData.chatsData[chatIndex].lastMessage = "Images";
                            userChatData.chatsData[chatIndex].updatedAt = Date.now();
                            
                            if (userChatData.chatsData[chatIndex].rId === userData.id) {
                                userChatData.chatsData[chatIndex].messageSeen = false;
                            }
                            
                            await updateDoc(userChatsRef, {
                                chatsData: userChatData.chatsData
                            });
                        }
                    }
                });
            }
        } catch (error) {
            console.error("Send image error:", error);
            toast.error(error.message);
        }
    };


    // Listen for Messages in Real-time
    useEffect(() => {
        if (messagesId) {
            const unSub = onSnapshot(doc(db, 'messages', messagesId), (res) => {
                if (res.exists()) {
                    setMessages(res.data().messages.reverse());
                }
            });
            return () => {
                unSub();
            };
        }
    }, [messagesId, setMessages]);

    // Format Timestamp to Readable Time
    const convertTimestamp = (timestamp) => {
        let date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        let hour = date.getHours();
        let minute = date.getMinutes();
        let ampm = hour >= 12 ? 'PM' : 'AM';
        hour = hour % 12;
        hour = hour ? hour : 12; 
        minute = minute < 10 ? '0' + minute : minute;
        return `${hour}:${minute} ${ampm}`;
    };

    return chatUser ? (
        <div className={`chat-box ${chatVisible ? "" : "hidden"}`}>
            {/* Top User Bar */}
            <div className="chat-user">
                <img src={chatUser.userData.avatar || assets.profile_img} alt="User Avatar" />
                <p> 
                    {chatUser.userData.name} 
                    {Date.now() - chatUser.userData.lastSeen <= 70000 ? <img className='dot' src={assets.green_dot} alt="Online status" /> : null }
                </p>
                <img src={assets.help_icon} className='help' alt="Help" />
                <img onClick={()=>setChatVisible(false)} src={assets.arrow_icon} className='arrow' alt="" />
                {/* Note: If you have a back arrow for mobile, you can add it here and use onClick={() => setChatVisible(false)} */}
            </div>

            {/* Dynamic Messages Container */}
            <div className="chat-msg">
                {messages && messages.map((msg, index) => (
                    <div key={index} className={msg.sId === userData.id ? "s-msg" : "r-msg"}>
                        {msg.image ? (
                            <img className="msg-img" src={msg.image} alt="message image" style={{maxWidth: "200px", borderRadius: "8px"}}  />
                        ) : (
                            <p className="msg">{msg.text}</p>
                        )}
                        <div>
                            <img 
                                src={msg.sId === userData.id ? (userData.avatar || assets.profile_img) : (chatUser.userData.avatar || assets.profile_img)} 
                                alt="Avatar" 
                            />
                            <p>{msg.createdAt ? convertTimestamp(msg.createdAt) : ""}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Input Bar */}
            <div className="chat-input">
                <input 
                    onChange={(e) => setInput(e.target.value)} 
                    value={input} 
                    type="text" 
                    placeholder='Send a message...' 
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()} 
                />
                <input onChange={sendImage} type="file" id='image' accept='image/png, image/jpeg' hidden />
                <label htmlFor="image">
                    <img src={assets.gallery_icon} alt="Gallery" />
                </label>
                <img onClick={sendMessage} src={assets.send_button} alt="Send" />
            </div>
        </div>
    ) : (
        <div className={`chat-welcome ${chatVisible ? "" : "hidden"}`}>
            <img src={assets.logo_icon} alt="Logo" />
            <p>Chat Anytime and anywhere!</p>
        </div>
    );
};

export default ChatBox;