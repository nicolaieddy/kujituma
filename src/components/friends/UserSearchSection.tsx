import { useState, useEffect } from "react";
import { UserSearchCard } from "./UserSearchCard";
import { useDebounce } from "@/hooks/useDebounce";
import { friendsService, UserProfile } from "@/services/friendsService";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, AlertCircle } from "lucide-react";

interface UserSearchSectionProps {
  onSendRequest: (userId: string) => Promise<{ success: boolean }>;
  loading?: boolean;
}

export const UserSearchSection = ({ onSendRequest, loading }: UserSearchSectionProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [allUsersLoaded, setAllUsersLoaded] = useState(false);
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const results = await friendsService.searchUsers(query);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const loadAllUsers = async () => {
    if (allUsersLoaded) return;
    
    setSearchLoading(true);
    try {
      const results = await friendsService.searchUsers('');
      setAllUsers(results);
      setAllUsersLoaded(true);
    } catch (error) {
      console.error('Error loading all users:', error);
      setAllUsers([]);
    } finally {
      setSearchLoading(false);
    }
  };

  useEffect(() => {
    const searchEffect = async () => {
      if (debouncedSearchQuery) {
        await handleSearch(debouncedSearchQuery);
      } else if (!allUsersLoaded) {
        await loadAllUsers();
      }
    };
    searchEffect();
  }, [debouncedSearchQuery]);

  useEffect(() => {
    if (!allUsersLoaded) {
      loadAllUsers();
    }
  }, []);

  const handleSendRequest = async (userId: string) => {
    const result = await onSendRequest(userId);
    if (result.success) {
      setSearchResults(prev => prev.filter(user => user.id !== userId));
      setAllUsers(prev => prev.filter(user => user.id !== userId));
    }
  };

  const displayUsers = searchQuery ? searchResults : allUsers;

  return (
    <Card className="border-border hover:border-primary/20 transition-colors">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <Search className="h-5 w-5" />
          Find Friends
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search for people by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {searchLoading && (
          <div className="text-center py-6">
            <p className="text-muted-foreground">Searching...</p>
          </div>
        )}

        {!searchLoading && searchQuery && searchResults.length === 0 && (
          <div className="text-center py-8 space-y-3">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">No users found matching "{searchQuery}"</p>
          </div>
        )}

        {!searchLoading && displayUsers.length > 0 && (
          <div className="space-y-4">
            {displayUsers.map((user) => (
              <UserSearchCard
                key={user.id}
                user={user}
                onSendRequest={handleSendRequest}
                loading={loading}
              />
            ))}
          </div>
        )}

        {!searchQuery && allUsers.length === 0 && !searchLoading && (
          <div className="text-center py-8 space-y-3">
            <Search className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">No new people to discover</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
