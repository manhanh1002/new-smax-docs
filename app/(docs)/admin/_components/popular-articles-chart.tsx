"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Loader2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTopRatedDocs } from "@/lib/actions/admin";

type TopDoc = {
  slug: string;
  title: string;
  avgHelpful: number;
  avgEasy: number;
  totalRaters: number;
  totalRatings: number;
};

type ChartData = TopDoc & { displayTitle: string };

const truncate = (str: string, maxLen: number) =>
  str.length > maxLen ? str.slice(0, maxLen) + "…" : str;

export function PopularArticlesChart() {
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTopRatedDocs(5)
      .then((docs) => {
        setData(
          docs.map((d) => ({
            ...d,
            displayTitle: truncate(d.title, 30),
          }))
        );
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Unknown error"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Biểu đồ bài viết phổ biến</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Biểu đồ bài viết phổ biến</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center text-sm text-destructive">
          {error}
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Biểu đồ bài viết phổ biến</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
          Chưa có dữ liệu đánh giá nào.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Bài viết phổ biến</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis
              type="number"
              domain={[0, 3]}
              tickCount={4}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              type="category"
              dataKey="displayTitle"
              width={130}
              tick={{ fontSize: 12 }}
              tickLine={false}
            />
            <Tooltip
              formatter={(value: number, name: string) => {
                const label =
                  name === "avgHelpful" ? "Hữu ích" : "Dễ hiểu";
                return [`${value.toFixed(2)} / 3`, label];
              }}
              labelFormatter={(_, payload) => {
                if (payload && payload.length > 0) {
                  const raw = payload[0]?.payload as ChartData;
                  return raw?.title ?? "";
                }
                return "";
              }}
              contentStyle={{ fontSize: 12 }}
            />
            <Legend
              formatter={(value: string) =>
                value === "avgHelpful" ? "Hữu ích" : "Dễ hiểu"
              }
            />
            <Bar
              dataKey="avgHelpful"
              name="avgHelpful"
              fill="#22c55e"
              radius={[0, 4, 4, 0]}
              label={{
                position: "right",
                formatter: (value: number, payload: { payload: ChartData }) => {
                  const raters = payload?.payload?.totalRaters ?? 0;
                  return raters > 0 ? ` (${raters})` : "";
                },
                fontSize: 11,
                fill: "#888",
              }}
              isAnimationActive={false}
            />
            <Bar
              dataKey="avgEasy"
              name="avgEasy"
              fill="#3b82f6"
              radius={[0, 4, 4, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
