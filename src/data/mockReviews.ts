import { Review } from '../types';

const mockReviews: Record<string, Review[]> = {
  '1': [
    {
      id: 'r1',
      propertyId: '1',
      authorId: 'a1',
      authorName: 'Alice Johnson',
      authorAvatar: 'https://i.pravatar.cc/150?u=a1',
      rating: 5,
      comment: 'Superbe séjour ! La vue est magnifique et le logement est impeccable.',
      date: new Date('2024-03-20T12:00:00Z'),
      isVerified: true,
      stayDuration: 'court terme',
    },
    {
      id: 'r2',
      propertyId: '1',
      authorId: 'a2',
      authorName: 'Marc Uwimana',
      authorAvatar: 'https://i.pravatar.cc/150?u=a2',
      rating: 4,
      comment: 'Très belle villa, très confortable. Un peu loin du centre à pied mais le calme en vaut la peine.',
      date: new Date('2024-04-02T10:30:00Z'),
      isVerified: true,
      stayDuration: 'long terme',
      ownerReply: {
        text: 'Merci Marc ! Ravie que vous ayez apprécié le calme de la villa.',
        date: new Date('2024-04-03T09:00:00Z'),
      },
    }
  ],
  '2': [
    {
      id: 'r3',
      propertyId: '2',
      authorId: 'a3',
      authorName: 'Kévin Rudasingwa',
      authorAvatar: 'https://i.pravatar.cc/150?u=a3',
      rating: 4,
      comment: 'Parfait pour mes études. Le Wifi est très stable et le quartier est vivant.',
      date: new Date('2024-04-10T15:45:00Z'),
      isVerified: true,
      stayDuration: 'long terme',
    }
  ],
  '3': [
    {
      id: 'r4',
      propertyId: '3',
      authorId: 'a4',
      authorName: 'Sarah Smith',
      rating: 4.5,
      comment: 'Maison très spacieuse, idéale pour ma famille. Les enfants ont adoré le jardin.',
      date: new Date('2024-03-25T11:20:00Z'),
      isVerified: true,
      stayDuration: 'court terme',
    }
  ]
};

export default mockReviews;
