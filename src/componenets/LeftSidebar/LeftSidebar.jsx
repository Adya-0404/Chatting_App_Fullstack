import React, { useEffect, useState, useContext } from 'react';
import './LeftSidebar.css';
import assets from '../../assets/assets';
import { useNavigate } from 'react-router-dom';
import { arrayUnion, collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { db, logout } from '../../config/firebase'; 
import { AppContext } from '../../context/AppContext';
import { toast } from 'react-toastify';

const LeftSidebar = () => {
    const navigate = useNavigate();
    const { userData, chatData, chatUser, setChatUser, setMessagesId, messagesId, chatVisible, setChatVisible } = useContext(AppContext);
    const [user, setUser] = useState(null);
    const [showSearch, setShowSearch] = useState(false);

    const inputHandler = async (e) => {
        try {
            const input = e.target.value.trim(); 
            
            if (input) {
                setShowSearch(true); 
                const userRef = collection(db, 'users');
                const q = query(userRef, where("username", "==", input.toLowerCase()));
                const querySnap = await getDocs(q);
                
                if (!querySnap.empty) {
                    const foundUser = querySnap.docs[0].data();
                    if (foundUser.id !== userData?.id) {
                        setUser(foundUser);
                    } else {
                        setUser(null); 
                    }
                } else {
                    setUser(null); 
                }
            } else {
                setUser(null);
                setShowSearch(false);
            }
        } catch (error) {
            console.error("Search Error:", error);
        }
    };

    const addChat = async () => {
        try {
            if (user.id === userData.id) {
                toast.error("You cannot add yourself!");
                setUser(null);
                setShowSearch(false);
                return;
            }
            
            const chatExists = chatData?.some(chat => chat.rId === user.id);
            if (chatExists) {
                toast.warning("Chat entry already exists!");
                setUser(null);
                setShowSearch(false);
                return; 
            }

            const messagesRef = collection(db, "messages");
            const chatsRef = collection(db, "chats");
            
            const newMessageRef = doc(messagesRef);
            await setDoc(newMessageRef, {
                createdAt: serverTimestamp(),
                messages: []
            });

            await setDoc(doc(chatsRef, user.id), {
                chatsData: arrayUnion({
                    messageId: newMessageRef.id,
                    lastMessage: "",
                    rId: userData.id,
                    updatedAt: Date.now(),
                    messageSeen: false,
                    userData: {
                        id: userData.id,
                        name: userData.name,
                        avatar: userData.avatar || "" 
                    }
                })
            }, { merge: true });

            await setDoc(doc(chatsRef, userData.id), {
                chatsData: arrayUnion({
                    messageId: newMessageRef.id,
                    lastMessage: "",
                    rId: user.id,
                    updatedAt: Date.now(),
                    messageSeen: true,
                    userData: {
                        id: user.id,
                        name: user.name,
                        avatar: user.avatar || ""
                    }
                })
            }, { merge: true });

            setUser(null);
            setShowSearch(false);
            toast.success("Chat added successfully!");
            
            const uSnap = await getDoc(doc(db, "users", user.id));
            const uData = uSnap.data();
            
            setChat({
                messageId: newMessageRef.id, 
                lastMessage: "",
                rId: user.id,
                updatedAt: Date.now(),
                messageSeen: true,
                userData: uData
            });

            setShowSearch(false);
            setChatVisible(true);

        } catch (error) {
            console.error(error);
            toast.error(error.message);
        }
    };
   
    const setChat = async (item) => {
        try {
            setMessagesId(item.messageId);
            setChatUser(item);
            
            const userChatsRef = doc(db, 'chats', userData.id);
            const userChatsSnapshot = await getDoc(userChatsRef);
            
            if (userChatsSnapshot.exists()) {
                const userChatsData = userChatsSnapshot.data();
                const chatIndex = userChatsData.chatsData.findIndex((c) => c.messageId === item.messageId);
                
                if (chatIndex !== -1) {
                    userChatsData.chatsData[chatIndex].messageSeen = true;
                    await updateDoc(userChatsRef, {
                        chatsData: userChatsData.chatsData
                    });
                }
            }
            setChatVisible(true);
        } catch (error) {
            toast.error(error.message);
        }
    };

    useEffect(() => {
        const updateChatUserData = async () => {
            if (chatUser) {
                const userRef = doc(db, "users", chatUser.userData.id);
                const userSnap = await getDoc(userRef);
                const uData = userSnap.data();
                setChatUser(prev => ({ ...prev, userData: uData }));
            }
        };
        updateChatUserData();
    }, [chatData]);

    return (
        <div className={`ls ${chatVisible ? "hidden" : ""}`}>
            <div className="ls-top">
                <div className="ls-nav">
                    <img src={assets.logo} className='logo' alt="App Logo" />
                    <div className="menu">
                        <img src={assets.menu_icon} alt="Menu" />
                        <div className="sub-menu">
                            <p onClick={() => navigate('/ProfileUpdate')}>Edit Profile</p>
                            <hr />
                            <p onClick={() => logout()}>Logout</p>
                        </div>
                    </div>
                </div>
                <div className="ls-search">
                    <img src={assets.search_icon} alt="Search" />
                    <input onChange={inputHandler} type="text" placeholder='Search by username...' />
                </div>
            </div>
            <div className="ls-list">
                {showSearch && user ? (
                    <div onClick={addChat} className="friends add-user">
                        <img src={user.avatar || assets.profile_img} alt="User Avatar" />
                        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                            <p>{user.name}</p>
                        </div>
                    </div>
                ) : (
                    chatData?.map((item, index) => (
                        <div onClick={() => setChat(item)} key={index} className={`friends ${item.messageSeen || item.messageId === messagesId ? "" : "border"}`}>
                            <img src={item.userData.avatar || assets.profile_img} alt="Friend Avatar" />
                            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-start" }}>
                                <p style={{ margin: 0 }}>{item.userData.name}</p>
                                <span style={{ margin: 0, fontSize: "13px", }}>{item.lastMessage}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default LeftSidebar;