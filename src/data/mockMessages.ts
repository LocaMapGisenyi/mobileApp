import { Conversation, Message } from '../types';

export const currentUser = {
  id: 'user123',
  name: 'Jean Mugabo',
  avatar: 'https://i.pravatar.cc/150?u=user123',
};

export const mockConversations: Conversation[] = [
  {
    id: 'conv1',
    propertyId: '1',
    propertyTitle: 'Villa moderne avec vue sur le lac',
    otherUser: {
      id: 'owner1',
      name: 'John Doe',
      avatar: 'https://i.pravatar.cc/150?u=owner1',
      isOwner: true,
    },
    messages: [
      {
        id: 'm1',
        text: 'Bonjour, est-ce que la villa est disponible pour la période du 10 au 15 mai ?',
        createdAt: new Date('2024-04-10T10:00:00Z'),
        user: currentUser,
        sent: true,
        received: true,
        read: true,
      },
      {
        id: 'm2',
        text: 'Bonjour Jean ! Oui, la villa est disponible à ces dates. Seriez-vous intéressé par une visite ?',
        createdAt: new Date('2024-04-10T11:30:00Z'),
        user: {
          id: 'owner1',
          name: 'John Doe',
          avatar: 'https://i.pravatar.cc/150?u=owner1',
        },
        sent: true,
        received: true,
        read: false,
      }
    ],
    unreadCount: 1,
    lastMessageAt: new Date('2024-04-10T11:30:00Z'),
  },
  {
    id: 'conv2',
    propertyId: '2',
    propertyTitle: 'Appartement central pour étudiants',
    otherUser: {
      id: 'owner2',
      name: 'Jane Smith',
      avatar: 'https://i.pravatar.cc/150?u=owner2',
      isOwner: true,
    },
    messages: [
      {
        id: 'm3',
        text: 'Pourriez-vous me donner plus d\'informations sur la vitesse du Wifi ?',
        createdAt: new Date('2024-04-05T14:20:00Z'),
        user: currentUser,
        sent: true,
        received: true,
        read: true,
      },
      {
        id: 'm4',
        text: 'Bien sûr, nous avons la fibre optique avec une vitesse moyenne de 50 Mbps.',
        createdAt: new Date('2024-04-05T15:00:00Z'),
        user: {
          id: 'owner2',
          name: 'Jane Smith',
          avatar: 'https://i.pravatar.cc/150?u=owner2',
        },
        sent: true,
        received: true,
        read: true,
      }
    ],
    unreadCount: 0,
    lastMessageAt: new Date('2024-04-05T15:00:00Z'),
  }
];

export const getRandomResponse = () => {
  const responses = [
    'Merci pour votre message ! Je reviens vers vous très vite.',
    'D\'accord, je note cela. Avez-vous d\'autres questions ?',
    'C\'est parfait pour moi. Quand souhaiteriez-vous passer ?',
    'Le logement est très calme, vous allez l\'adorer.',
    'Oui, tout est inclus dans le prix affiché.'
  ];
  return responses[Math.floor(Math.random() * responses.length)];
};
