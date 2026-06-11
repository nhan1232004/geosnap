const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();
const messaging = admin.messaging();

// Send notification when user posts something
exports.notifyFollowersOnNewPost = functions.firestore
  .document('posts/{postId}')
  .onCreate(async (snap, context) => {
    const post = snap.data();
    const userId = post.uid;

    try {
      // Get user's followers
      const followersSnap = await db.collection('friendships')
        .where('addresseeId', '==', userId)
        .where('status', '==', 'accepted')
        .get();

      const tasks = [];

      for (const doc of followersSnap.docs) {
        const followerId = doc.data().requesterId;

        // Get follower's push token
        const followerSnap = await db.collection('users').doc(followerId).get();
        const pushToken = followerSnap.data()?.pushToken;

        if (pushToken) {
          const task = messaging.send({
            notification: {
              title: `${post.userProfile?.displayName || 'User'} đã đăng bài mới`,
              body: post.content ? post.content.substring(0, 50) + '...' : 'Xem bài viết'
            },
            data: {
              screen: `/feed`,
              postId: snap.id
            },
            android: {
              priority: 'high',
              notification: {
                sound: 'default',
                clickAction: 'FLUTTER_NOTIFICATION_CLICK'
              }
            },
            webpush: {
              fcmOptions: {
                link: `https://geosnap-4dd7a.web.app/feed`
              }
            },
            token: pushToken
          });

          tasks.push(task);
        }
      }

      await Promise.all(tasks);
      console.log(`Notified followers about new post by ${userId}`);
    } catch (error) {
      console.error('Error notifying followers:', error);
    }
  });

// Send notification when receiving a message
exports.notifyNewMessage = functions.firestore
  .document('messages/{messageId}')
  .onCreate(async (snap, context) => {
    const message = snap.data();
    const senderId = message.senderId;
    const recipientId = message.recipientId;

    try {
      // Get recipient's push token
      const recipientSnap = await db.collection('users').doc(recipientId).get();
      const pushToken = recipientSnap.data()?.pushToken;
      const senderSnap = await db.collection('users').doc(senderId).get();
      const senderName = senderSnap.data()?.displayName || 'Unknown User';

      if (pushToken) {
        await messaging.send({
          notification: {
            title: `Tin nhắn từ ${senderName}`,
            body: message.content.substring(0, 50) + (message.content.length > 50 ? '...' : '')
          },
          data: {
            screen: `/messages`,
            conversationId: message.conversationId
          },
          android: {
            priority: 'high',
            notification: {
              sound: 'default',
              clickAction: 'FLUTTER_NOTIFICATION_CLICK'
            }
          },
          token: pushToken
        });
      }
    } catch (error) {
      console.error('Error notifying message recipient:', error);
    }
  });

// Send notification for friend requests
exports.notifyFriendRequest = functions.firestore
  .document('friendships/{friendshipId}')
  .onCreate(async (snap, context) => {
    const friendship = snap.data();
    const addresseeId = friendship.addresseeId;
    const requesterId = friendship.requesterId;

    if (friendship.status !== 'pending') return;

    try {
      // Get addressee's push token
      const addresseeSnap = await db.collection('users').doc(addresseeId).get();
      const pushToken = addresseeSnap.data()?.pushToken;
      const requesterSnap = await db.collection('users').doc(requesterId).get();
      const requesterName = requesterSnap.data()?.displayName || 'Unknown User';

      if (pushToken) {
        await messaging.send({
          notification: {
            title: `${requesterName} gửi lời kết bạn`,
            body: 'Nhấn để xem profile của họ'
          },
          data: {
            screen: `/profile/${requesterId}`
          },
          android: {
            priority: 'high',
            notification: {
              sound: 'default'
            }
          },
          token: pushToken
        });
      }
    } catch (error) {
      console.error('Error notifying friend request:', error);
    }
  });
