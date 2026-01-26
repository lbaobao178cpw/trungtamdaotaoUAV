import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import "./solutions_page.css";
import { API_ENDPOINTS } from "../../config/apiConfig";

const SolutionDetail = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_ENDPOINTS.SOLUTIONS}/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((result) => {
        setData(result);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div style={{ padding: 100, textAlign: 'center' }}>Đang tải dữ liệu...</div>;
  if (!data) return <div style={{ padding: 100, textAlign: 'center' }}>Không tìm thấy trang này.</div>;

  // Extract YouTube video ID
  const extractYouTubeId = (url) => {
    if (!url) return null;
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/
    ];
    for (let pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  // Convert YouTube URL to embed URL
  const getYouTubeEmbedUrl = (videoUrl) => {
    const videoId = extractYouTubeId(videoUrl);
    return videoId ? `https://www.youtube.com/embed/${videoId}` : videoUrl;
  };

  const renderHeroMedia = () => {
    const videoUrl = data.hero_video;
    const imgUrl = data.image;

    if (videoUrl && videoUrl.trim() !== "") {
      // Xử lý video YouTube
      if (videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be")) {
        return (
          <div className="hero-video-embed" style={{ borderRadius: 20, overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', pointerEvents: 'none' }}>
            <iframe
              width="100%"
              height="400"
              src={getYouTubeEmbedUrl(videoUrl) + '?autoplay=1&mute=1&controls=0&loop=1'}
              title="Hero Video"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              sandbox="allow-same-origin allow-scripts allow-presentation allow-popups"
              allowFullScreen
            ></iframe>
          </div>
        );
      }

      // Video MP4/Upload
      return (
        <video
          src={videoUrl}
          poster={imgUrl}
          className="w-full h-auto drop-shadow-2xl"
          style={{
            borderRadius: 20,
            pointerEvents: 'none',
            userSelect: 'none'
          }}
          autoPlay
          loop
          muted
          playsInline
        >
          Trình duyệt không hỗ trợ thẻ video.
        </video>
      );
    }
    return (
      <img src={imgUrl} alt={data.title} className="w-full h-auto drop-shadow-2xl" onError={(e) => { e.target.src = 'https://via.placeholder.com/600x400' }} />
    );
  };

  // --- HÀM RENDER SERVICES ĐÃ SỬA ---
  const renderServices = () => {
    let sections = [];
    try {
      // Cố gắng parse JSON, nếu data.content là string HTML thì catch sẽ xử lý
      sections = JSON.parse(data.content);
    } catch (e) {
      return <div className="container" dangerouslySetInnerHTML={{ __html: data.content }} />;
    }

    if (!Array.isArray(sections)) return null;

    return (
      <div className="services-container">
        {sections.map((section, index) => {
          // Logic: Hàng chẵn (0, 2...) => Hình Trái. Hàng lẻ (1, 3...) => Hình Phải
          const isReverse = index % 2 !== 0;

          const listItems = section.items ? section.items.split('\n') : [];
          const validImages = Array.isArray(section.images)
            ? section.images.filter((img) => img && img.trim() !== "")
            : [];

          return (
            <div
              key={index}
              className={`service-block ${isReverse ? "service-block-reverse" : ""}`}
            >
              {/* --- CỘT HÌNH ẢNH --- */}
              {validImages.length > 0 && (
                validImages.length === 1 ? (
                  // Chỉ có 1 ảnh
                  <div className="service-single-image">
                    <img src={validImages[0]} alt={section.title} />
                  </div>
                ) : (
                  // Có nhiều ảnh -> Grid 2x2 (tối đa hiển thị 4 ảnh đầu tiên)
                  <div className="service-images">
                    {validImages.slice(0, 4).map((imgUrl, i) => (
                      <div key={i} className="service-image-card">
                        <img src={imgUrl} alt={`${section.title} ${i}`} />
                      </div>
                    ))}
                  </div>
                )
              )}

              {/* --- CỘT NỘI DUNG --- */}
              <div className="service-content">
                <h3 className="service-title">{section.title}</h3>
                <ul className="service-list">
                  {listItems.map((item, idx) =>
                    item.trim() && <li key={idx}>{item}</li>
                  )}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderClients = () => {
    let clients = [];
    try { clients = JSON.parse(data.client_images); } catch (e) { return null; }
    const validClients = Array.isArray(clients) ? clients.filter(c => c && c.trim() !== "") : [];

    if (validClients.length === 0) return null;

    return (
      <div className="clients-grid">
        {validClients.map((imgUrl, index) => (
          <div key={index} className="client-logo"><img src={imgUrl} alt={`Client ${index}`} /></div>
        ))}
      </div>
    );
  }

  return (
    <main className="mining-page">
      <section className="hero-section">
        <div className="container">
          <div className="hero-grid">
            <div className="hero-content">
              <h1 className="hero-title">{data.title}</h1>
              <p className="hero-description">{data.hero_description || data.description}</p>
              <button className="hero-btn">Liên Hệ Ngay

              </button>
            </div>
            <div className="hero-image">{renderHeroMedia()}</div>
          </div>
        </div>
      </section>

      <section className="services-section">
        <div className="container">
          <h2 className="section-title">{data.service_title || "Explore Our Services"}</h2>
          {renderServices()}
        </div>
      </section>

      {data.bottom_title && (
        <section className="bluehawk-section">
          <div className="container">
            <div className="bluehawk-content">
              <div className="bluehawk-header">
                <h2 className="bluehawk-title">{data.bottom_title}</h2>
              </div>
              <div className="bluehawk-text"><p>{data.bottom_description}</p></div>
            </div>
          </div>
        </section>
      )}

      {data.video_url && (
        <section className="video-section">
          <div className="video-bg" />
          <div className="container video-container">
            <div className="video-content">
              <h2 className="video-title">{data.video_title || "Video Introduction"}</h2>
              <div className="video-embed">
                {data.video_url.includes("youtube.com") || data.video_url.includes("youtu.be") ? (
                  <iframe
                    width="100%"
                    height="500"
                    src={getYouTubeEmbedUrl(data.video_url) + '?modestbranding=1&rel=0&fs=1&autoplay=0'}
                    title="Intro Video"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    sandbox="allow-same-origin allow-scripts allow-presentation allow-popups"
                    allowFullScreen
                    style={{ display: 'block' }}
                  ></iframe>
                ) : (
                  <video
                    width="100%"
                    height="500"
                    controls
                    style={{ display: 'block', backgroundColor: '#000' }}
                  >
                    <source src={data.video_url} type="video/mp4" />
                    Trình duyệt không hỗ trợ thẻ video.
                  </video>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="clients-section">
        <div className="container">
          <h2 className="clients-title">{data.client_title || "Clientele"}</h2>
          {renderClients()}
        </div>
      </section>
    </main>
  );
};

export default SolutionDetail;