// GoMate 前端类型定义

export interface Location {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  coverImage: string;
  images: string[];
  difficulty: 'easy' | 'moderate' | 'hard' | 'extreme';
  duration: string;
  distance: string;
  elevation: string;
  bestSeason: string[];
  tags: string[];
  location: {
    address: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  routeGuide: {
    overview: string;
    waypoints: {
      name: string;
      description: string;
      distance: string;
    }[];
    tips: string[];
    warnings: string[];
  };
  facilities: {
    parking: boolean;
    restroom: boolean;
    water: boolean;
    food: boolean;
  };
}

export interface Team {
  id: string;
  locationId: string;
  title: string;
  description: string;
  date: string;
  time: string;
  duration: string;
  maxMembers: number;
  currentMembers: number;
  requirements: string[];
  leader: {
    id: string;
    name: string;
    avatar: string;
    level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    completedHikes: number;
    bio: string;
  };
  status: 'open' | 'full' | 'closed';
  createdAt: string;
}
